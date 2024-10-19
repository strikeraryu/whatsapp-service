FROM node:slim

# Install ffmpeg and chromium dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \ 
    nano \
    zip unzip \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    chromium \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN mkdir /app/action

RUN npm install

CMD ["/bin/bash"]
