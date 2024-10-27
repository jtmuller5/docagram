document.addEventListener('DOMContentLoaded', async () => {
    const temperatureInput = document.getElementById('temperature');
    const temperatureValue = document.getElementById('temperature-value');
    const topKInput = document.getElementById('top-k');
    const topKValue = document.getElementById('top-k-value');
    const saveButton = document.getElementById('save');
    const successMessage = document.getElementById('success-message');
  
    // Load saved settings
    const settings = await chrome.storage.sync.get({
      temperature: 0.3,
      topK: 40
    });
  
    temperatureInput.value = settings.temperature;
    temperatureValue.textContent = settings.temperature;
    topKInput.value = settings.topK;
    topKValue.textContent = settings.topK;
  
    // Update value displays
    temperatureInput.addEventListener('input', (e) => {
      temperatureValue.textContent = e.target.value;
    });
  
    topKInput.addEventListener('input', (e) => {
      topKValue.textContent = e.target.value;
    });
  
    // Save settings
    saveButton.addEventListener('click', async () => {
      await chrome.storage.sync.set({
        temperature: parseFloat(temperatureInput.value),
        topK: parseInt(topKInput.value, 10)
      });
  
      successMessage.classList.add('active');
      setTimeout(() => {
        successMessage.classList.remove('active');
      }, 3000);
    });
  });