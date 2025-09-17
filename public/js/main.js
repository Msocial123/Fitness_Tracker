document.getElementById('register-form')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const fullname = document.getElementById('fullname').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const goal = document.getElementById('goal').value;
  const role = document.getElementById('role')?.value || 'client'; // Default to client if not present

  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullname, email, password, goal, role })
  });

  const data = await res.json();
  if (res.ok && data.msg === 'Registered successfully') {
    alert('Registered!');
    window.location.href = '/pages/login.html';
  } else {
    alert(data.msg || 'Error');
  }
});

document.getElementById('login-form')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const email = document.getElementById('email-login').value;
  const password = document.getElementById('password-login').value;
  const role = document.getElementById('role-login')?.value || 'client';

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });

  const data = await res.json();
  if (res.ok && data.success) {
    localStorage.setItem('user', JSON.stringify(data));
    alert(`Welcome ${data.fullname}`);
    if (data.role === 'trainer') {
      window.location.href = '/pages/trainer-panel.html';
    } else {
      window.location.href = '/pages/log-workout.html';
    }
  } else {
    alert(data.msg || 'Login failed');
  }
});

function logout() {
  localStorage.removeItem('user');
  window.location.href = '/pages/login.html';
}