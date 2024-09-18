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
  
  <main class="flex-col container mx-auto p-4 justify-center">
    {#if hasDriversLicense === null}
      <h2 class="text-xl font-bold mb-4">Do you have a PA driver's license?</h2>
      <div class="flex justify-center gap-4">
        <button on:click={() => handleDriversLicenseResponse(true)} class="btn btn-primary mr-2">Yes</button>
        <button on:click={() => handleDriversLicenseResponse(false)} class="btn btn-primary">No</button>
      </div>
    {:else if hasDriversLicense}
      <p class="mb-4">Great! You can proceed directly to the PA voter registration application.</p>
      <button on:click={goToPARegistration} class="btn btn-success">Go to PA Registration</button>
    {:else}
      <p class="mb-4">
        PA requires a photo of your signature. Take a photo here first and save it to your device before heading to the registration site.</p>
      {#if !isCameraActive}
        <button on:click={openCamera} class="btn btn-primary mb-4">Open Camera</button>
      {:else}
        <video id="camera" class="w-full mb-4 border-2 border-gray-800 rounded-lg" autoplay playsinline>
          <track kind="captions" src="" label="Captions" />
        </video>
        <button on:click={saveSignature} class="btn btn-outline btn-primary">
          Capture Signature
        </button>
      {/if}
      {#if isPhotoTaken}
      <div class="card bg-base-100 shadow-xl p-6 mt-4">
        <figure><img src={photoUrl} alt="Signature" class="w-full rounded-lg" /></figure>

        <div class="card-body">
          <h2 class="card-title text-success">Signature captured successfully!</h2>
          <p class="text-sm text-base-content opacity-70">
            {canShare ? 'The image has been shared. Please save it to your device.' : 'Please save this image to your device before proceeding.'}
          </p>
          <div class="card-actions justify-center mt-4">
            <button on:click={clearSignature} class="btn btn-outline btn-error">Clear and Retake</button>
            <button on:click={downloadSignature} class="btn btn-primary">Save to Device</button>
            <button on:click={goToPARegistration} class="btn btn-success mt-4">Go to PA Registration</button>
          </div>
        </div>
      </div>
      {/if}
    {/if}
    <canvas id="canvas" class="hidden"></canvas>
  </main>
  
  <style>
    /* You can remove this style block if you're using Tailwind/daisyUI for all styling */
  </style>