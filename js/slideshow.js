(function () {
  "use strict";

  const slides = document.querySelectorAll('.slide');
  const btns = document.querySelectorAll('.btn');
  if (!slides || !slides.length) return;

  let currentSlide = 0;
  let slideInterval = null;

  // Manual Navigation Function
  const manualNav = function (manual) {
    if (!slides[manual]) return;
    slides.forEach((slide) => slide.classList.remove('active'));
    btns.forEach((btn) => btn.classList.remove('active'));

    slides[manual].classList.add('active');
    if (btns[manual]) btns[manual].classList.add('active');
  };

  // Manual Navigation Event Listeners
  btns.forEach((btn, i) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      manualNav(i);
      currentSlide = i;
      resetAutoplay();
    });
  });

  // Autoplay Navigation Function
  const startAutoplay = () => {
    if (slides.length <= 1) return;
    if (slideInterval) clearInterval(slideInterval);
    slideInterval = setInterval(() => {
      currentSlide = (currentSlide + 1) % slides.length;
      manualNav(currentSlide);
    }, 5000);
  };

  const resetAutoplay = () => {
    if (slideInterval) clearInterval(slideInterval);
    startAutoplay();
  };

  startAutoplay();
})();