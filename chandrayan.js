document.addEventListener('DOMContentLoaded', function () {
    const authGate = document.querySelector('#auth-gate');
    const protectedSite = document.querySelector('#protected-site');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    const signupForm = document.querySelector('#signup-form');
    const loginForm = document.querySelector('#login-form');
    const logoutButton = document.querySelector('#logout-button');
    const authMessage = document.querySelector('#auth-message');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function showAuthMessage(message, isError = false) {
        authMessage.textContent = message;
        authMessage.classList.toggle('is-error', isError);
    }

    function showAuthView(view) {
        authTabs.forEach(tab => {
            const isActive = tab.dataset.authView === view;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
        });

        authForms.forEach(form => {
            const isActive = form.id === `${view}-form`;
            form.classList.toggle('is-active', isActive);
            form.hidden = !isActive;
        });

        showAuthMessage('');
    }

    function showProtectedSite(user, withTransition = true) {
        showAuthMessage(`Access granted for ${user.email}`);
        authGate.classList.add('is-leaving');

        const reveal = () => {
            authGate.hidden = true;
            authGate.classList.remove('is-leaving');
            protectedSite.hidden = false;
            document.body.classList.remove('auth-locked');
            window.scrollTo(0, 0);
        };

        if (withTransition && !reduceMotion) {
            window.setTimeout(reveal, 420);
        } else {
            reveal();
        }
    }

    function showAuthGate(message = '') {
        protectedSite.hidden = true;
        authGate.hidden = false;
        authGate.classList.remove('is-leaving');
        document.body.classList.add('auth-locked');
        showAuthView('login');
        showAuthMessage(message);
        window.scrollTo(0, 0);
        window.setTimeout(() => document.querySelector('#login-email').focus(), 0);
    }

    async function sendAuthRequest(url, form) {
        const formData = new FormData(form);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result.message || 'Request failed');
        }

        return result;
    }

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => showAuthView(tab.dataset.authView));
    });

    signupForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        showAuthMessage('Creating archive access...');

        try {
            const result = await sendAuthRequest('/api/auth/signup', signupForm);
            signupForm.reset();
            showProtectedSite(result.user);
        } catch (error) {
            showAuthMessage(error.message, true);
        }
    });

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        showAuthMessage('Verifying archive access...');

        try {
            const result = await sendAuthRequest('/api/auth/login', loginForm);
            loginForm.reset();
            showProtectedSite(result.user);
        } catch (error) {
            showAuthMessage(error.message, true);
        }
    });

    logoutButton.addEventListener('click', async function () {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('Logout failed');
            }

            showAuthGate('You have been logged out.');
        } catch (error) {
            window.alert(error.message);
        }
    });

    authGate.hidden = false;
    protectedSite.hidden = true;
    document.body.classList.add('auth-locked');
    showAuthView('login');

    fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(response => response.ok ? response.json() : null)
        .then(result => {
            if (result && result.user) {
                showProtectedSite(result.user, false);
            } else {
                document.querySelector('#login-email').focus();
            }
        })
        .catch(() => {
            showAuthMessage('Unable to verify archive access. Please try again.', true);
        });

    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach(item => {
        item.addEventListener('mouseenter', function () {
            this.classList.add('is-hovered');
        });
        item.addEventListener('mouseleave', function () {
            this.classList.remove('is-hovered');
        });
    });

    const timelineDetails = document.querySelectorAll('#timeline details');
    timelineDetails.forEach(detail => {
        detail.addEventListener('toggle', function () {
            if (!detail.open) {
                return;
            }

            timelineDetails.forEach(otherDetail => {
                if (otherDetail !== detail) {
                    otherDetail.open = false;
                }
            });
        });
    });

    if (!reduceMotion && 'IntersectionObserver' in window) {
        const timelineObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    timelineObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.18 });

        timelineItems.forEach(item => timelineObserver.observe(item));
    } else {
        timelineItems.forEach(item => item.classList.add('is-visible'));
    }

    const galleryCards = document.querySelectorAll('.gallery-card');
    const galleryLightbox = document.querySelector('#gallery-lightbox');
    const lightboxImage = document.querySelector('#lightbox-image');
    const lightboxCaption = document.querySelector('#lightbox-caption');
    const lightboxClose = document.querySelector('.lightbox-close');
    let lastFocusedGalleryCard;

    function closeGalleryLightbox() {
        galleryLightbox.hidden = true;
        document.body.classList.remove('lightbox-open');
        lightboxImage.src = '';
        if (lastFocusedGalleryCard) {
            lastFocusedGalleryCard.focus();
        }
    }

    galleryCards.forEach(card => {
        card.addEventListener('click', function () {
            lastFocusedGalleryCard = card;
            lightboxImage.src = card.dataset.galleryImage;
            lightboxImage.alt = card.querySelector('img').alt;
            lightboxCaption.textContent = card.dataset.galleryCaption;
            galleryLightbox.hidden = false;
            document.body.classList.add('lightbox-open');
            lightboxClose.focus();
        });
    });

    lightboxClose.addEventListener('click', closeGalleryLightbox);
    galleryLightbox.addEventListener('click', function (event) {
        if (event.target === galleryLightbox) {
            closeGalleryLightbox();
        }
    });
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !galleryLightbox.hidden) {
            closeGalleryLightbox();
        }
    });

    if (!reduceMotion && 'IntersectionObserver' in window) {
        const galleryObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    galleryObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        galleryCards.forEach(card => galleryObserver.observe(card));
    } else {
        galleryCards.forEach(card => card.classList.add('is-visible'));
    }

    const teamDetails = document.querySelectorAll('#team details');
    teamDetails.forEach(detail => {
        detail.addEventListener('toggle', function () {
            if (!detail.open) {
                return;
            }

            teamDetails.forEach(otherDetail => {
                if (otherDetail !== detail) {
                    otherDetail.open = false;
                }
            });
        });
    });

    const missionFacts = document.querySelectorAll('#mission details');
    missionFacts.forEach(fact => {
        fact.addEventListener('toggle', function () {
            if (!fact.open) {
                return;
            }

            missionFacts.forEach(otherFact => {
                if (otherFact !== fact) {
                    otherFact.open = false;
                }
            });
        });
    });

});