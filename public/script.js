document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("reportForm");

  if (!form) {
    console.error("Form not found");
    return;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const photoInput = document.getElementById("photo");
    const descriptionInput = document.getElementById("description");

    if (!photoInput.files.length) {
      alert("Please upload a photo");
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const formData = new FormData();
      formData.append("photo", photoInput.files[0]);
      formData.append("latitude", latitude);
      formData.append("longitude", longitude);
      formData.append("description", descriptionInput.value || "");

      try {
        const response = await fetch("/api/report", {
          method: "POST",
          body: formData
        });

        const result = await response.json();

        if (response.ok) {
          alert("Report submitted successfully");
          form.reset();
        } else {
          alert(result.message || "Error sending report");
        }

      } catch (error) {
        console.error(error);
        alert("Network error");
      }

    }, () => {
      alert("Location permission denied");
    });

  });

});
