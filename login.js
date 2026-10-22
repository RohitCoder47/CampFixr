const form = document.getElementById("login-form");
const toast = document.getElementById("toast");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("toggle-password");
let toastTimer;

togglePassword.addEventListener("click", function () {
  const showing = passwordInput.type === "password";
  passwordInput.type = showing ? "text" : "password";
  togglePassword.textContent = showing ? "Hide" : "Show";
  togglePassword.setAttribute("aria-label", showing ? "Hide password" : "Show password");
  togglePassword.setAttribute("aria-pressed", String(showing));
});

document.getElementById("forgot-link").addEventListener("click", function (event) {
  event.preventDefault();
  document.getElementById("reset-username").value =
    document.getElementById("username").value.trim();
  document.getElementById("reset-feedback").textContent = "";
  document.getElementById("reset-backdrop").hidden = false;
  document.getElementById("reset-username").focus();
});

document.getElementById("register-link").addEventListener("click", function (event) {
  event.preventDefault();
  document.getElementById("register-feedback").textContent = "";
  document.getElementById("register-backdrop").hidden = false;
  document.getElementById("register-username").focus();
});

document.getElementById("close-reset").addEventListener("click", closeResetCard);
document.getElementById("reset-backdrop").addEventListener("click", function (event) {
  if (event.target.id === "reset-backdrop") closeResetCard();
});
document.getElementById("close-register").addEventListener("click", closeRegisterCard);
document.getElementById("register-backdrop").addEventListener("click", function (event) {
  if (event.target.id === "register-backdrop") closeRegisterCard();
});

function closeResetCard() {
  document.getElementById("reset-backdrop").hidden = true;
}

function closeRegisterCard() {
  document.getElementById("register-backdrop").hidden = true;
}

function showLoginMessage(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 5000);
}

document.getElementById("register-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const registrationForm = event.currentTarget;
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value;
  const confirmation = document.getElementById("register-confirm-password").value;
  const feedback = document.getElementById("register-feedback");

  if (password.length < 8) {
    feedback.textContent ="The password must be at least 8 characters long.";
    return;
  }
  if (password !== confirmation) {
    feedback.textContent = "The passwords do not match.";
    return;
  }

  const submitButton = registrationForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  feedback.textContent ="Creating account…";

  try {
    const response = await fetch("/api/auth/register-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (error) {
      throw new Error("Registration route not found. Please restart the server using the updated `server.js` file.");
    }
    if (!response.ok) throw new Error(result.message ||"Account creation failed.");

    closeRegisterCard();
    registrationForm.reset();
    document.getElementById("username").value = username;
    document.getElementById("password").value = "";
    showLoginMessage(result.message || "Account created successfully. Please sign in now.");
  } catch (error) {
    feedback.textContent = error.message || "Unable to connect to the server.";
  } finally {
    submitButton.disabled = false;
  }
});

document.getElementById("reset-password-form").addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = document.getElementById("reset-username").value.trim();
  const code = document.getElementById("reset-code").value.trim();
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const feedback = document.getElementById("reset-feedback");

  if (newPassword.length < 8) {
    feedback.textContent ="The new password must be at least 8 characters long.";
    return;
  }
  if (newPassword !== confirmPassword) {
    feedback.textContent = "The passwords do not match.";
    return;
  }

  const submitButton = event.currentTarget.querySelector("button[type='submit']");
  submitButton.disabled = true;
  feedback.textContent = "Updating password…";

  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, code, newPassword })
    });
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (error) {
      throw new Error("Password reset route not found. Please restart the server and try again.");
    }
    if (!response.ok) throw new Error(result.message || "Password reset failed.");

    closeResetCard();
    document.getElementById("reset-password-form").reset();
    document.getElementById("password").value = "";
    showLoginMessage(result.message || "Password reset successfully. Please sign in with your new password.");
  } catch (error) {
    feedback.textContent = error.message || "Password reset failed.";
  } finally {
    submitButton.disabled = false;
  }
});

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const remember = document.getElementById("remember").checked;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Login failed. Please check your details and try again.");
      return;
    }

    if (!data.token) {
      alert("No token received in the login response. Please check the server's login route.");
      return;
    }

    localStorage.removeItem("campusCareToken");
    sessionStorage.removeItem("campusCareToken");
    localStorage.removeItem("campusCareUser");
    sessionStorage.removeItem("campusCareUser");

    const storage = remember ? localStorage : sessionStorage;

    storage.setItem("campusCareToken", data.token);
    storage.setItem("campusCareUser", JSON.stringify(data.user || {
      username: username
    }));

    window.location.href = "dashboard.html";
  } catch (error) {
    alert("Unable to connect to the server. Please check whether the server is running.");
  }
});
