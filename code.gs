// আপনার Google Drive ফোল্ডার ID এবং OnlineCompiler.io API Key এখানে বসান
const FOLDER_ID = "10ntJC3pTf7cGNlxDeXj3nzL_oNhtStL7";
const ONLINECOMPILER_API_KEY = "553477ed9b4955fdc20450d542020dd5";

function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    let result = {};

    if (action === "compile") {
      // ১. OnlineCompiler.io দিয়ে জাভা কোড কম্পাইল ও রান করা
      const output = compileWithOnlineCompiler(requestData.code, requestData.input);
      result = { status: "success", output: output };

    } else if (action === "save") {
      // ২. Google Drive-এ ফাইল সেভ করা
      const msg = saveJavaFile(requestData.fileName, requestData.code);
      result = { status: "success", message: msg };

    } else if (action === "listFiles") {
      // ৩. ফোল্ডারে থাকা সব ফাইলের তালিকা আনা
      const files = getSavedFilesList();
      result = { status: "success", files: files };

    } else if (action === "loadFile") {
      // ৪. নির্দিষ্ট ফাইলের কোড পড়া
      const code = readJavaFile(requestData.fileId);
      result = { status: "success", code: code };

    } else {
      result = { status: "error", message: "Invalid action requested." };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// OnlineCompiler.io API কল করার ফাংশন
function compileWithOnlineCompiler(javaCode, stdinInput) {
  const url = "https://api.onlinecompiler.io/api/v2/run-code/";
  
  const payload = {
    compiler: "java-openjdk-17", // প্রয়োজন অনুযায়ী java-openjdk-21 বা java ব্যবহার করতে পারেন
    code: javaCode,
    input: stdinInput || ""
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": ONLINECOMPILER_API_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());

  // আউটপুট বা কম্পাইলেশন এরর রিটার্ন করা
  if (json.output !== undefined && json.output !== "") {
    return json.output;
  } else if (json.error !== undefined && json.error !== "") {
    return "Error:\n" + json.error;
  } else {
    return json.message || "Program executed with no output.";
  }
}

// Google Drive-এ ফাইল সেভ বা আপডেট করার ফাংশন
function saveJavaFile(fileName, code) {
  if (!fileName.endsWith(".java")) {
    fileName += ".java";
  }
  
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const existingFiles = folder.getFilesByName(fileName);

  if (existingFiles.hasNext()) {
    const file = existingFiles.next();
    file.setContent(code);
    return "Updated existing file: " + fileName;
  } else {
    folder.createFile(fileName, code, MimeType.PLAIN_TEXT);
    return "Saved new file: " + fileName;
  }
}

// সেভ করা ফাইলের তালিকা আনার ফাংশন
function getSavedFilesList() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const files = folder.getFiles();
  const fileList = [];

  while (files.hasNext()) {
    const file = files.next();
    if (!file.isTrashed()) {
      fileList.push({
        id: file.getId(),
        name: file.getName()
      });
    }
  }
  return fileList;
}

// নির্দিষ্ট ফাইলের ভেতরের কোড পড়ার ফাংশন
function readJavaFile(fileId) {
  const file = DriveApp.getFileById(fileId);
  return file.getBlob().getDataAsString();
}
