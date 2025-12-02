<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyDIwwaM49HmhDvwZLOBZgIAwcjC6o6YCds",
    authDomain: "login-bd835.firebaseapp.com",
    projectId: "login-bd835",
    storageBucket: "login-bd835.firebasestorage.app",
    messagingSenderId: "269949134668",
    appId: "1:269949134668:web:120d224031312fd1d651e9",
    measurementId: "G-BQC7RYG1N6"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>