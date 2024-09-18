<script lang="ts">
	import { onMount } from 'svelte';
	import * as piexif from 'piexifjs';

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
		window.open(
			'https://www.pavoterservices.pa.gov/Pages/VoterRegistrationApplication.aspx',
			'_blank'
		);
	}

	function clearSignature() {
		isPhotoTaken = false;
		photoUrl = '';
		photoBlob = null;

		// Stop the current stream if it exists
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
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
			console.error('Error accessing camera:', err);
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
		const ctx = canvasElement.getContext('2d');
		if (ctx) {
			ctx.drawImage(videoElement, 0, 0);
			processImage(canvasElement);

			if (canShare) {
				try {
					if (photoBlob) {
						const file = new File([photoBlob], 'signature.jpg', { type: 'image/jpeg' });
						await navigator.share({
							files: [file],
							title: 'Save Signature',
							text: 'Please save this signature image to your device.'
						});
					}
				} catch (error) {
					console.error('Error sharing:', error);
					// Fallback to download if sharing fails
					downloadSignature();
				}
			} else {
				downloadSignature();
			}
		} else {
			console.error('Failed to get 2D context for canvas');
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

		scaledCanvas.width = Math.round(canvas.width * scaleFactor);
		scaledCanvas.height = Math.round(canvas.height * scaleFactor);

		if (ctx) {
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = 'high';
			ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

			const imageData = scaledCanvas.toDataURL('image/jpeg', 0.95);

            const initialExifObj = {"0th": {}, "Exif": {}, "GPS": {}, "Interop": {}, "1st": {}, "thumbnail": null};
            const exifBytes = piexif.dump(initialExifObj);
			const insertedImageData = piexif.insert(exifBytes, imageData);
			const rawImageData = atob(insertedImageData.split(',')[1]);
			const array = new Uint8Array(rawImageData.length);

			for(let i = 0; i < rawImageData.length; i++) {
				array[i] = rawImageData.charCodeAt(i);
			}

			const blob = new Blob([array], {type: 'image/jpeg'});
			photoBlob = blob;
			photoUrl = URL.createObjectURL(blob);
			isPhotoTaken = true;
			isCameraActive = false;

			// Set DPI to 75
			const dpi = 75;
			const zeroth: { [key: number]: any } = {};
			zeroth[piexif.ImageIFD.XResolution] = [dpi, 1];
			zeroth[piexif.ImageIFD.YResolution] = [dpi, 1];
			zeroth[piexif.ImageIFD.ResolutionUnit] = 2; // inches

			const exifObj = {"0th": zeroth, "Exif": {}, "GPS": {}, "Interop": {}, "1st": {}, "thumbnail": null};
			const exifStr = piexif.dump(exifObj);

			const newImageData = piexif.insert(exifStr, imageData);
			const newBlob = dataURItoBlob(newImageData);
			photoBlob = newBlob;
			photoUrl = URL.createObjectURL(newBlob);
		} else {
			console.error('Failed to get 2D context');
		}
	}

	function dataURItoBlob(dataURI: string) {
		const byteString = atob(dataURI.split(',')[1]);
		const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
		const ab = new ArrayBuffer(byteString.length);
		const ia = new Uint8Array(ab);
		for (let i = 0; i < byteString.length; i++) {
			ia[i] = byteString.charCodeAt(i);
		}
		return new Blob([ab], {type: mimeString});
	}
</script>

<main class="container mx-auto p-4 flex flex-col items-center">
	<div class="max-w-md w-full">
			{#if hasDriversLicense === null}
				<h2 class="text-xl mb-4 text-center">Do you have a PA driver's license?</h2>
				<div class="flex justify-center gap-4">
					<button on:click={() => handleDriversLicenseResponse(true)} class="btn btn-primary"
						>Yes</button
					>
					<button on:click={() => handleDriversLicenseResponse(false)} class="btn btn-primary"
						>No</button
					>
				</div>
			{:else if hasDriversLicense}
				<p class="mb-4 text-center">
					Great! You can proceed directly to the PA voter registration application.
				</p>
				<div class="flex justify-center">
					<button on:click={goToPARegistration} class="btn btn-success">Go to PA Registration</button>
				</div>
			{:else}
				<p class="mb-4 text-center">
					PA requires a photo of your signature. Take a photo here first and save it to your device
					before heading to the registration site.
				</p>
				<div class="flex justify-center">
					{#if !isCameraActive}
						{#if !isPhotoTaken}
							<button on:click={openCamera} class="btn btn-primary mb-4">Open Camera</button>
						{/if}
					{:else}
						<div class="flex-col items-center justify-center">
							<video id="camera" class="w-full mb-4" autoplay playsinline>
								<track kind="captions" src="" label="Captions" />
							</video>
							<div class="flex justify-center">
								<button on:click={saveSignature} class="btn btn-outline btn-primary">
									Capture Signature
								</button>
							</div>
						</div>
					{/if}
				</div>
				{#if isPhotoTaken}
					<div class="flex-col items-center justify-center">
						<img src={photoUrl} alt="Signature" class="w-full rounded-lg border-4 border-primary" />

						<div class="card-body">
							<h2 class="card-title text-success bg-primary text-primary-content p-2 italic">Signature captured successfully!</h2>
							<p class="text-sm text-base-content opacity-70">
								{canShare
									? "Your signature should have been saved to your device automatically. You're ready to continue to PA's voter registration site!"
									: 'Please save this image to your device before proceeding.'}
							</p>
							<div class="flex flex-col justify-center mt-4 gap-4">
								<button on:click={clearSignature} class="btn btn-outline btn-error"
									>Clear and Retake</button
								>
								<button on:click={saveSignature} class="btn btn-primary">Save to Device</button>
								<button on:click={goToPARegistration} class="btn btn-success"
									>Go to PA Registration</button
								>
							</div>
						</div>
					</div>
				{/if}
			{/if}
	</div>
</main>

<style>
	/* You can remove this style block if you're using Tailwind/daisyUI for all styling */
</style>
