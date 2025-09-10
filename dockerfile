# Gunakan image Node.js
FROM node:18

# Set direktori kerja dalam container
WORKDIR /app

# Copy semua file ke dalam container
COPY . .

# Install dependencies
RUN npm install

# Jalankan server
CMD ["node", "server.js"]

# Ekspose port agar bisa diakses dari luar container
EXPOSE 5000
