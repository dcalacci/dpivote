<script lang="ts">
    import { onMount } from 'svelte';
    let stream: MediaStream | null = null;
    let videoElement;
    let canvasElement;
    let isCameraActive = false;
    let isPhotoTaken = false;
    let photoUrl = '';
    let hasDriversLicense: boolean | null = null;
    let showCamera = false;
    let canShare = false;
    let photoBlob: Blob | null = null;
  
    onMount(() => {
      canShare = 'share' in navigator;
    });
  
    function handleDriversLicenseResponse(has: boolean) {
      hasDriversLicense = has;
      if (!has) {
        showCamera = true;
      }
    }
  
    function goToPARegistration() {
      window.open('https://www.pavoterservices.pa.gov/Pages/VoterRegistrationApplication.aspx', '_blank');
    }
  
    function clearSignature() {
      isPhotoTaken = false;
      photoUrl = '';
      photoBlob = null;
      
      // Stop the current stream if it exists
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Reopen the camera
      openCamera();
    }
  
    // function getElements() {
    //   videoElement = document.getElementById('camera');
    //   canvasElement = document.getElementById('canvas');
    // }
  
    async function openCamera() {
      console.log('Opening camera');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        isCameraActive = true;
        console.log('Camera opened, isCameraActive set to true');
        
        setTimeout(() => {
          const videoElement = document.getElementById('camera') as HTMLVideoElement;
          if (videoElement) {
            videoElement.srcObject = stream;
            console.log('Video element found and stream attached');
          } else {
            console.error('Video element not found');
            isCameraActive = false;
          }
        }, 0);
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Unable to access the camera. Please make sure you've granted permission.");
        isCameraActive = false;
      }
    }
  
    async function saveSignature() {
      const videoElement = document.getElementById('camera') as HTMLVideoElement;
      if (!videoElement) {
        console.error('Video element not found');
        return;
      }

      const canvasElement = document.createElement('canvas');
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      canvasElement.getContext('2d')?.drawImage(videoElement, 0, 0);
      
      try {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvasElement.toBlob((b) => b ? resolve(b) : reject('Blob is null'), 'image/jpeg', 0.8);
        });
        photoBlob = blob;
        photoUrl = URL.createObjectURL(blob);
        isPhotoTaken = true;
        isCameraActive = false;
  
        if (canShare) {
          try {
            const file = new File([blob], 'signature.jpg', { type: 'image/jpeg' });
            await navigator.share({
              files: [file],
              title: 'Save Signature',
              text: 'Please save this signature image to your device.'
            });
          } catch (error) {
            console.error('Error sharing:', error);
            // Fallback to download if sharing fails
            downloadSignature();
          }
        } else {
          downloadSignature();
        }
      } catch (error) {
        console.error('Error capturing signature:', error);
        alert('Failed to capture signature. Please try again.');
      }
    }
  
    function downloadSignature() {
      if (photoBlob) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(photoBlob);
        link.download = 'signature.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  
    function processImage(canvas: HTMLCanvasElement) {
      const scaleFactor = 75 / 96; // 75 DPI / 96 DPI (default)
      const scaledCanvas = document.createElement('canvas');
      const ctx = scaledCanvas.getContext('2d');
      
      scaledCanvas.width = canvas.width * scaleFactor;
      scaledCanvas.height = canvas.height * scaleFactor;
      
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        photoUrl = scaledCanvas.toDataURL('image/png');
      } else {
        console.error('Failed to get 2D context');
      }
      isPhotoTaken = true;
      isCameraActive = false;
    }
  </script>
  
  <main class="container mx-auto p-4">
    {#if hasDriversLicense === null}
      <h2 class="text-xl mb-4">Do you have a PA driver's license?</h2>
      <div>
        <button on:click={() => handleDriversLicenseResponse(true)} class="bg-blue-500 text-white px-4 py-2 rounded mr-2">Yes</button>
        <button on:click={() => handleDriversLicenseResponse(false)} class="bg-blue-500 text-white px-4 py-2 rounded">No</button>
      </div>
    {:else if hasDriversLicense}
      <p class="mb-4">Great! You can proceed directly to the PA voter registration application.</p>
      <button on:click={goToPARegistration} class="bg-green-500 text-white px-4 py-2 rounded">Go to PA Registration</button>
    {:else}
      <p class="mb-4">PA requires a photo of your signature with strict requirements. Please take a photo here first and save it to your device before proceeding to the registration site.</p>
      {#if !isCameraActive}
        <button on:click={openCamera} class="bg-blue-500 text-white px-4 py-2 rounded mb-4">Open Camera</button>
      {:else}
        <video id="camera" class="w-full mb-4" autoplay playsinline>
          <track kind="captions" src="" label="Captions" />
        </video>
        <button
          on:click={saveSignature}
          class="bg-white text-black font-bold px-6 py-3 rounded-lg border-4 border-black shadow-md hover:bg-gray-100 transition-colors duration-300 ease-in-out font-sans"
        >
          Capture Signature
        </button>
      {/if}
      {#if isPhotoTaken}
      <div class="p-6">
        <img src={photoUrl} alt="Signature" class="w-full mb-4 rounded-lg" />
        <p class="text-center text-lg font-semibold text-green-600">Signature captured successfully!</p>
        <p class="text-center text-sm text-gray-600 mt-2">
          {canShare ? 'The image has been shared. Please save it to your device.' : 'Please save this image to your device before proceeding.'}
        </p>
        <div class="flex justify-center mt-4">
          {#if !canShare}
            <button on:click={downloadSignature} class="bg-blue-500 text-white px-4 py-2 rounded mr-2">Save to Device</button>
          {/if}
          <button on:click={clearSignature} class="bg-red-500 text-white px-4 py-2 rounded">Clear and Retake</button>
        </div>
      </div>
      {/if}
      <button on:click={goToPARegistration} class="bg-green-500 text-white px-4 py-2 rounded">Go to PA Registration</button>
    {/if}
    <canvas id="canvas" style="display: none;"></canvas>
  </main>
  
  <style>
    :global(body) {
      background-color: #f9fafb;
      color: #1f2937;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
  </style>