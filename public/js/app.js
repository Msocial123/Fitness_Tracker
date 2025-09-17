// ===== App Configuration =====
const APP_CONFIG = {
  API_BASE_URL: '/api/auth',
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 5000
};

// ===== Utility Functions =====
const Utils = {
  // Debounce function for performance
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Format date for display
  formatDate: (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  // Validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate password strength
  validatePassword: (password) => {
    const minLength = password.length >= 6;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    
    return {
      isValid: minLength && hasNumber && hasLetter,
      minLength,
      hasNumber,
      hasLetter
    };
  },

  // Generate random ID
  generateId: () => {
    return Math.random().toString(36).substr(2, 9);
  },

  // Local storage helpers
  storage: {
    get: (key) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error('Error getting item from localStorage:', error);
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('Error setting item in localStorage:', error);
        return false;
      }
    },
    remove: (key) => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('Error removing item from localStorage:', error);
        return false;
      }
    }
  }
};

// ===== API Service =====
const API = {
  // Generic API request handler
  request: async (endpoint, options = {}) => {
    const url = `${APP_CONFIG.API_BASE_URL}${endpoint}`;
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.msg || `HTTP error! status: ${response.status}`);
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('API request failed:', error);
      return { 
        success: false, 
        error: error.message || 'Network error occurred' 
      };
    }
  },

  // Authentication endpoints
  auth: {
    register: (userData) => API.request('/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
    
    login: (credentials) => API.request('/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
    
    logout: () => API.request('/logout', {
      method: 'POST'
    })
  },

  // Workout endpoints
  workouts: {
    create: (workoutData) => API.request('/log-workout', {
      method: 'POST',
      body: JSON.stringify(workoutData)
    }),
    
    getByEmail: (email) => API.request(`/workouts/${email}`)
  },

  // Metrics endpoints
  metrics: {
    create: (metricsData) => API.request('/metrics', {
      method: 'POST',
      body: JSON.stringify(metricsData)
    }),
    
    getByEmail: (email) => API.request(`/metrics/${email}`)
  },

  // Trainer endpoints
  plans: {
    create: (planData) => API.request('/plans', {
      method: 'POST',
      body: JSON.stringify(planData)
    }),
    
    getByTrainer: (trainerEmail) => API.request(`/plans/${trainerEmail}`),
    
    update: (id, planData) => API.request(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(planData)
    }),
    
    delete: (id) => API.request(`/plans/${id}`, {
      method: 'DELETE'
    })
  }
};

// ===== Toast Notification System =====
const Toast = {
  container: null,

  init: () => {
    if (!Toast.container) {
      Toast.container = document.createElement('div');
      Toast.container.className = 'toast-container';
      document.body.appendChild(Toast.container);
    }
  },

  show: (message, type = 'info', duration = APP_CONFIG.TOAST_DURATION) => {
    Toast.init();
    
    const toast = document.createElement('div');
    const id = Utils.generateId();
    toast.id = id;
    toast.className = `toast ${type}`;
    
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };

    toast.innerHTML = `
      <div class="toast-content">
        <i class="${icons[type]}" style="margin-right: 8px;"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="Toast.hide('${id}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    Toast.container.appendChild(toast);
    
    // Trigger show animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Auto hide
    setTimeout(() => Toast.hide(id), duration);
  },

  hide: (id) => {
    const toast = document.getElementById(id);
    if (toast) {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  },

  success: (message) => Toast.show(message, 'success'),
  error: (message) => Toast.show(message, 'error'),
  warning: (message) => Toast.show(message, 'warning'),
  info: (message) => Toast.show(message, 'info')
};


// ===== Form Validation =====
const FormValidator = {
  // Get user-friendly field name
  getFriendlyFieldName: (fieldName) => {
    const friendlyNames = {
      'client-fullname': 'Full Name',
      'client-email': 'Email Address',
      'client-password': 'Password',
      'client-confirm-password': 'Confirm Password',
      'client-goal': 'Fitness Goal',
      'trainer-fullname': 'Full Name',
      'trainer-email': 'Email Address', 
      'trainer-password': 'Password',
      'trainer-confirm-password': 'Confirm Password',
      'trainer-specialization': 'Specialization',
      'trainer-experience': 'Years of Experience',
      'trainer-certification': 'Certifications',
      'email-login': 'Email Address',
      'password-login': 'Password',
      'role-login': 'Account Type',
      'fullname': 'Full Name',
      'email': 'Email Address',
      'password': 'Password',
      'confirm-password': 'Confirm Password',
      'goal': 'Fitness Goal',
      'specialization': 'Specialization',
      'experience': 'Years of Experience'
    };
    
    return friendlyNames[fieldName] || fieldName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  },

  // Add error to form field
  addError: (field, message) => {
    const formGroup = field.closest('.form-group');
    const errorElement = formGroup.querySelector('.form-error');
    
    formGroup.classList.add('error');
    formGroup.classList.remove('success');
    
    if (errorElement) {
      errorElement.textContent = message;
    }
  },

  // Add success to form field
  addSuccess: (field) => {
    const formGroup = field.closest('.form-group');
    formGroup.classList.add('success');
    formGroup.classList.remove('error');
  },

  // Clear validation state
  clearValidation: (field) => {
    const formGroup = field.closest('.form-group');
    formGroup.classList.remove('error', 'success');
  },

  // Validate single field
  validateField: (field, rules = {}) => {
    const value = field.value.trim();
    const fieldName = field.getAttribute('name') || field.id;
    
    // Get user-friendly field name
    const friendlyName = FormValidator.getFriendlyFieldName(fieldName);
    
    // Clear previous validation
    FormValidator.clearValidation(field);
    
    // Required validation
    if (rules.required && !value) {
      FormValidator.addError(field, `${friendlyName} is required`);
      return false;
    }
    
    // Email validation
    if (rules.email && value && !Utils.isValidEmail(value)) {
      FormValidator.addError(field, 'Please enter a valid email address');
      return false;
    }
    
    // Password validation
    if (rules.password && value) {
      const validation = Utils.validatePassword(value);
      if (!validation.isValid) {
        let message = 'Password must be at least 6 characters';
        if (!validation.hasNumber) message += ' and contain a number';
        if (!validation.hasLetter) message += ' and contain a letter';
        FormValidator.addError(field, message);
        return false;
      }
    }
    
    // Confirm password validation
    if (rules.confirmPassword && value) {
      // Find the password field in the same form
      const form = field.closest('form');
      const passwordField = form.querySelector('input[name="password"]');
      if (passwordField && value !== passwordField.value) {
        FormValidator.addError(field, 'Passwords do not match');
        return false;
      }
    }
    
    // Min length validation
    if (rules.minLength && value && value.length < rules.minLength) {
      FormValidator.addError(field, `Minimum ${rules.minLength} characters required`);
      return false;
    }
    
    // Add success state if field has value and no errors
    if (value) {
      FormValidator.addSuccess(field);
    }
    
    return true;
  },

  // Validate entire form
  validateForm: (form, validationRules) => {
    let isValid = true;
    
    Object.keys(validationRules).forEach(fieldName => {
      const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
      if (field) {
        // Only validate visible fields
        const fieldContainer = field.closest('.form-group');
        const isVisible = fieldContainer && 
          getComputedStyle(fieldContainer).display !== 'none' && 
          getComputedStyle(fieldContainer).visibility !== 'hidden';
        
        if (isVisible) {
          const fieldValid = FormValidator.validateField(field, validationRules[fieldName]);
          if (!fieldValid) {
            isValid = false;
          }
        }
      }
    });
    
    return isValid;
  }
};

// ===== Main Application =====
class FitnessApp {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.initializeApp();
    });
  }

  initializeApp() {
    // Load current user
    this.loadCurrentUser();
    
    // Initialize components
    this.initializeNavigation();
    this.initializeForms();
    this.initializeModals();
    this.initializePasswordToggles();
    this.initializeAccountTypeSelector();
    
    
    console.log('FitTrack Pro initialized successfully');
  }

  loadCurrentUser() {
    this.currentUser = Utils.storage.get('user');
  }

  initializeNavigation() {
    // Mobile menu toggle
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    
    if (hamburger && navMenu) {
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
      });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });

    // Navbar scroll effect
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', Utils.debounce(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      if (navbar) {
        if (scrollTop > 100) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      }
      
      lastScrollTop = scrollTop;
    }, 10));
  }

  initializeForms() {
    // Client registration form
    const clientForm = document.getElementById('client-form');
    if (clientForm) {
      this.initializeClientForm(clientForm);
    }
    
    // Trainer registration form
    const trainerForm = document.getElementById('trainer-form');
    if (trainerForm) {
      this.initializeTrainerForm(trainerForm);
    }

    // Login form (if on login page)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      this.initializeLoginForm(loginForm);
    }
  }

  initializeClientForm(form) {
    const validationRules = {
      'client-fullname': { required: true, minLength: 2 },
      'client-email': { required: true, email: true },
      'client-password': { required: true, password: true },
      'client-confirm-password': { required: true, confirmPassword: true },
      'client-goal': { required: true }
    };

    // Real-time validation
    Object.keys(validationRules).forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('blur', () => {
          FormValidator.validateField(field, validationRules[fieldId]);
        });
        
        field.addEventListener('input', Utils.debounce(() => {
          if (field.value.trim()) {
            FormValidator.validateField(field, validationRules[fieldId]);
          } else {
            FormValidator.clearValidation(field);
          }
        }, 300));
      }
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!FormValidator.validateForm(form, validationRules)) {
        Toast.error('Please fix the errors in the form');
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;

      const userData = {
        fullname: document.getElementById('client-fullname').value.trim(),
        email: document.getElementById('client-email').value.trim().toLowerCase(),
        password: document.getElementById('client-password').value,
        goal: document.getElementById('client-goal').value,
        role: 'client'
      };

      try {
        const result = await API.auth.register(userData);
        
        if (result.success) {
          Toast.success('Account created successfully! Please log in.');
          this.showSuccessModal();
          form.reset();
          
          // Clear form validation states
          form.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('success', 'error');
          });
        } else {
          Toast.error(result.error || 'Registration failed');
        }
      } catch (error) {
        console.error('Registration error:', error);
        Toast.error('An unexpected error occurred');
      } finally {
        submitButton.disabled = false;
      }
    });
  }
  
  initializeTrainerForm(form) {
    const validationRules = {
      'trainer-fullname': { required: true, minLength: 2 },
      'trainer-email': { required: true, email: true },
      'trainer-password': { required: true, password: true },
      'trainer-confirm-password': { required: true, confirmPassword: true },
      'trainer-specialization': { required: true },
      'trainer-experience': { required: true }
    };

    // Real-time validation
    Object.keys(validationRules).forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('blur', () => {
          FormValidator.validateField(field, validationRules[fieldId]);
        });
        
        field.addEventListener('input', Utils.debounce(() => {
          if (field.value.trim()) {
            FormValidator.validateField(field, validationRules[fieldId]);
          } else {
            FormValidator.clearValidation(field);
          }
        }, 300));
      }
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!FormValidator.validateForm(form, validationRules)) {
        Toast.error('Please fix the errors in the form');
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;

      const userData = {
        fullname: document.getElementById('trainer-fullname').value.trim(),
        email: document.getElementById('trainer-email').value.trim().toLowerCase(),
        password: document.getElementById('trainer-password').value,
        specialization: document.getElementById('trainer-specialization').value,
        experience: document.getElementById('trainer-experience').value,
        certification: document.getElementById('trainer-certification').value || '',
        role: 'trainer'
      };

      try {
        const result = await API.auth.register(userData);
        
        if (result.success) {
          Toast.success('Account created successfully! Please log in.');
          this.showSuccessModal();
          form.reset();
          
          // Clear form validation states
          form.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('success', 'error');
          });
        } else {
          Toast.error(result.error || 'Registration failed');
        }
      } catch (error) {
        console.error('Registration error:', error);
        Toast.error('An unexpected error occurred');
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  initializeLoginForm(form) {
    const validationRules = {
      'email-login': { required: true, email: true },
      'password-login': { required: true },
      'role-login': { required: true }
    };

    // Real-time validation
    Object.keys(validationRules).forEach(fieldName => {
      const field = form.querySelector(`#${fieldName}`);
      if (field) {
        field.addEventListener('blur', () => {
          FormValidator.validateField(field, validationRules[fieldName]);
        });
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!FormValidator.validateForm(form, validationRules)) {
        Toast.error('Please fill in all fields correctly');
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;

      const formData = new FormData(form);
      const credentials = {
        email: formData.get('email-login') || document.getElementById('email-login').value,
        password: formData.get('password-login') || document.getElementById('password-login').value,
        role: formData.get('role-login') || document.getElementById('role-login').value
      };

      try {
        const result = await API.auth.login(credentials);
        
        if (result.success && result.data.success) {
          const userData = result.data;
          Utils.storage.set('user', userData);
          this.currentUser = userData;
          
          Toast.success(`Welcome back, ${userData.fullname}!`);
          
          // Redirect based on role
          setTimeout(() => {
            if (userData.role === 'trainer') {
              window.location.href = '/pages/trainer-panel.html';
            } else {
              window.location.href = '/pages/log-workout.html';
            }
          }, 1000);
        } else {
          Toast.error(result.error || 'Invalid credentials');
        }
      } catch (error) {
        console.error('Login error:', error);
        Toast.error('An unexpected error occurred');
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  initializePasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const input = toggle.previousElementSibling;
        const icon = toggle.querySelector('i');
        
        if (input.type === 'password') {
          input.type = 'text';
          icon.className = 'fas fa-eye-slash';
        } else {
          input.type = 'password';
          icon.className = 'fas fa-eye';
        }
      });
    });
  }

  initializeModals() {
    // Success modal
    const modal = document.getElementById('success-modal');
    const loginRedirectBtn = document.getElementById('login-redirect');
    
    if (loginRedirectBtn) {
      loginRedirectBtn.addEventListener('click', () => {
        window.location.href = '/pages/login.html';
      });
    }

    // Close modal when clicking outside
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideModal('success-modal');
        }
      });
    }

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideAllModals();
      }
    });
  }

  showSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('active');
    });
    document.body.style.overflow = '';
  }
  
  initializeAccountTypeSelector() {
    const clientToggle = document.getElementById('client-toggle');
    const trainerToggle = document.getElementById('trainer-toggle');
    const formTitle = document.getElementById('form-title');
    const formSubtitle = document.getElementById('form-subtitle');
    const clientForm = document.getElementById('client-form');
    const trainerForm = document.getElementById('trainer-form');
    
    if (!clientToggle || !trainerToggle) return; // Not on registration page
    
    const switchToRole = (role) => {
      // Update active states
      clientToggle.classList.toggle('active', role === 'client');
      trainerToggle.classList.toggle('active', role === 'trainer');
      
      // Update form content
      if (role === 'client') {
        formTitle.textContent = 'Create Your Client Account';
        formSubtitle.textContent = 'Start tracking your fitness journey today';
        
        // Show client form, hide trainer form
        clientForm.style.display = 'block';
        trainerForm.style.display = 'none';
        
        // Clear trainer form fields
        trainerForm.querySelectorAll('input, select, textarea').forEach(field => {
          field.value = '';
          FormValidator.clearValidation(field);
        });
        
      } else if (role === 'trainer') {
        formTitle.textContent = 'Create Your Trainer Account';
        formSubtitle.textContent = 'Join our platform and help others achieve their fitness goals';
        
        // Show trainer form, hide client form
        trainerForm.style.display = 'block';
        clientForm.style.display = 'none';
        
        // Clear client form fields
        clientForm.querySelectorAll('input, select, textarea').forEach(field => {
          field.value = '';
          FormValidator.clearValidation(field);
        });
      }
    };
    
    // Event listeners
    clientToggle.addEventListener('click', () => switchToRole('client'));
    trainerToggle.addEventListener('click', () => switchToRole('trainer'));
    
    // Handle "Become a Trainer" button clicks from pricing section
    document.querySelectorAll('a[href="#register"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const buttonText = link.textContent.toLowerCase();
        if (buttonText.includes('trainer') || buttonText.includes('become')) {
          setTimeout(() => {
            switchToRole('trainer');
          }, 100);
        }
      });
    });
    
    // Initialize with client role
    switchToRole('client');
  }
}

// ===== Dashboard Features (for logged-in users) =====
class Dashboard {
  constructor() {
    this.user = Utils.storage.get('user');
    this.init();
  }

  init() {
    if (!this.user) {
      window.location.href = '/pages/login.html';
      return;
    }

    this.initializeUserElements();
    this.initializeLogout();
  }

  initializeUserElements() {
    // Update user name displays
    document.querySelectorAll('#user-name-display').forEach(element => {
      element.textContent = `👤 ${this.user.fullname}`;
    });

    // Update user avatars
    document.querySelectorAll('#user-photo, .user-avatar').forEach(element => {
      element.title = this.user.fullname;
    });
  }

  initializeLogout() {
    // User photo click handlers
    document.querySelectorAll('#user-photo').forEach(photo => {
      photo.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.querySelector('#logout-menu');
        if (menu) {
          menu.classList.toggle('active');
        }
      });
    });

    // Logout button handlers
    document.querySelectorAll('#logout-btn, .logout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.logout();
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#user-photo-container')) {
        document.querySelectorAll('#logout-menu').forEach(menu => {
          menu.classList.remove('active');
        });
      }
    });
  }

  logout() {
    Utils.storage.remove('user');
    Toast.info('You have been logged out');
    
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  }
}

// ===== Initialize Application =====
const app = new FitnessApp();

// Initialize dashboard features if on a protected page
if (window.location.pathname.includes('/pages/') && 
    !window.location.pathname.includes('login.html') && 
    !window.location.pathname.includes('index.html')) {
  const dashboard = new Dashboard();
}

// ===== Export for use in other modules =====
window.FitnessApp = {
  API,
  Utils,
  Toast,
  FormValidator,
  Dashboard
};
