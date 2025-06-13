# 🐾 PetHelp – Pet Job Posting & Walker Platform

**PetHelp** is a full-stack web application built using the **MERN Stack** that connects pet parents with nearby pet walkers. It provides a seamless experience to post jobs, apply for walking opportunities, chat in real-time, and track locations live.

## 🌐 Live Links

- **Frontend**: [https://pet-help-woad.vercel.app](https://pet-help-woad.vercel.app)  
- **Backend**: [https://pethelp-thw5.onrender.com](https://pethelp-thw5.onrender.com)

---

## 🚀 Features

### 👥 User Roles
- **Pet Parents** can:
  - Register and login
  - Post pet walking jobs
  - View and manage job applications
  - Chat with walkers in real-time

- **Pet Walkers** can:
  - Register and login
  - View nearby jobs (within 10km radius)
  - Apply to jobs
  - Chat with pet parents

### 🔒 Authentication
- JWT-based login and registration
- Secure cookies (`httpOnly`, `SameSite=None`, `Secure`)

### 🗺️ Real-Time Location & Job Matching
- Location stored in MongoDB using GeoJSON
- Job visibility based on proximity (10 km radius)
- Map view via **React Leaflet** and **Nominatim API**

### 💬 Real-Time Chat
- Socket.io-powered instant messaging between users
- Online/offline status and `last seen` tracking

---

## ⚙️ Tech Stack

### 🔧 Backend
- **Node.js**, **Express.js**
- **MongoDB** & Mongoose
- **Socket.io** for real-time communication
- **JWT** for authentication
- **GeoJSON** for location-based queries
- Hosted on **Render**

### 🎨 Frontend
- **React.js**
- **Recoil** for state management
- **Axios** for API calls
- **React Leaflet** for maps
- **Tailwind CSS** for styling
- Hosted on **Vercel**

---

