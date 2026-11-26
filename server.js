const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// হেলথ চেক রুট (Render-এর জন্য)
app.get("/", (req, res) => {
  res.send("Interactive Java Compiler Server is Running!");
});

wss.on("connection", (ws) => {
  let javaProcess = null;
  let tempDir = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "run") {
        // আগের কোনো প্রসেস চললে বন্ধ করা
        if (javaProcess) {
          javaProcess.kill();
        }

        // প্রতিটি রানের জন্য আলাদা টেম্পোরারি ফোল্ডার তৈরি
        tempDir = fs.mkdtempSync(path.join("/tmp", "java-"));
        
        // কোড থেকে public class-এর নাম খুঁজে বের করা (না পেলে Main.java)
        const match = data.code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
        const className = match ? match[1] : "Main";
        const filePath = path.join(tempDir, `${className}.java`);

        fs.writeFileSync(filePath, data.code);

        // ১. জাভা কোড কম্পাইল করা (javac)
        const compile = spawn("javac", [filePath]);
        let compileError = "";

        compile.stderr.on("data", (err) => {
          compileError += err.toString();
        });

        compile.on("close", (code) => {
          if (code !== 0) {
            ws.send(JSON.stringify({ type: "output", text: compileError }));
            ws.send(JSON.stringify({ type: "exit" }));
            cleanup(tempDir);
            return;
          }

          // ২. কম্পাইল সফল হলে প্রোগ্রাম রান করা (java)
          javaProcess = spawn("java", ["-cp", tempDir, className]);

          javaProcess.stdout.on("data", (out) => {
            ws.send(JSON.stringify({ type: "output", text: out.toString() }));
          });

          javaProcess.stderr.on("data", (err) => {
            ws.send(JSON.stringify({ type: "output", text: err.toString() }));
          });

          javaProcess.on("close", () => {
            ws.send(JSON.stringify({ type: "exit" }));
            javaProcess = null;
            cleanup(tempDir);
          });
        });

      } else if (data.type === "input") {
        // ইউজার কনসোলে কিছু লিখে Enter চাপলে তা চলমান জাভা প্রোগ্রামে পাঠানো
        if (javaProcess && javaProcess.stdin.writable) {
          javaProcess.stdin.write(data.text + "\n");
        }
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: "output", text: "Server Error: " + e.message }));
    }
  });

  ws.on("close", () => {
    if (javaProcess) javaProcess.kill();
    cleanup(tempDir);
  });
});

function cleanup(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
