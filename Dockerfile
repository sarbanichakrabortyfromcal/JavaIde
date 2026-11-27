# অফিসিয়াল Java 17 (Ubuntu ভিত্তিক) ইমেজ, যাতে javac এবং java আগে থেকেই থাকে
FROM eclipse-temurin:17-jdk

# Node.js ইনস্টল করা
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
