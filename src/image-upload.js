/**
 * Custom module for quilljs to allow user to drag images from their file system into the editor
 * and paste images from clipboard (Works on Chrome, Firefox, Edge, not on Safari)
 * @see https://quilljs.com/blog/building-a-custom-module/
 */
export class ImageUpload {
	/**
	 * Instantiate the module given a quill instance and any options
	 * @param {Quill} quill
	 * @param {Object} options
	 */
	constructor(quill, options = {}) {
		// save the quill reference
		this.quill = quill;
		// save options
		this.options = options;
		// listen for drop and paste events
		this.quill
			.getModule('toolbar')
			.addHandler('image', this.selectLocalImage.bind(this));
	}

	/**
	 * Select local image
	 */
	selectLocalImage() {
		const input = document.createElement('input');
		input.setAttribute('type', 'file');
		input.click();

		// Listen upload local image and save to server
		input.onchange = () => {
			const file = input.files[0];

			// file type is only image.
			if (/^image\//.test(file.type)) {
				const checkBeforeSend =
					this.options.checkBeforeSend || this.checkBeforeSend.bind(this);
				checkBeforeSend(file, this.sendToServer.bind(this));
			} else {
				console.warn('You could only upload images.');
			}
		};
	}

	/**
	 * Check file before sending to the server
	 * @param {File} file
	 * @param {Function} next
	 */
	checkBeforeSend(file, next) {
		next(file);
	}

	/**
	 * Send to server
	 * @param {File} file
	 */
	sendToServer(file) {
		// Handle custom upload
		if (this.options.customUploader) {
			this.options.customUploader(file, dataUrl => {
				this.insert(dataUrl);
			});
		} else {
			const url = this.options.url,
				method = this.options.method || 'POST',
				name = this.options.name || 'image',
				headers = this.options.headers || {},
				callbackOK =
					this.options.callbackOK || this.uploadImageCallbackOK.bind(this),
				callbackKO =
					this.options.callbackKO || this.uploadImageCallbackKO.bind(this);

			if (url) {
				const fd = new FormData();

				fd.append(name, file);

				if (this.options.csrf) {
					// add CSRF
					fd.append(this.options.csrf.token, this.options.csrf.hash);
				}

				const xhr = new XMLHttpRequest();
				// init http query
				xhr.open(method, url, true);
				// add custom headers
				for (var index in headers) {
					xhr.setRequestHeader(index, headers[index]);
				}

				// listen callback
				xhr.onload = () => {
					if (xhr.status === 200) {
						callbackOK(JSON.parse(xhr.responseText), this.insert.bind(this));
					} else {
						callbackKO({
							code: xhr.status,
							type: xhr.statusText,
							body: xhr.responseText
						});
					}
				};

				if (this.options.withCredentials) {
					xhr.withCredentials = true;
				}

				xhr.send(fd);
			} else {
				const reader = new FileReader();

				reader.onload = event => {
					callbackOK(event.target.result, this.insert.bind(this));
				};
				reader.readAsDataURL(file);
			}
		}
	}

	/**
	 * Insert the image into the document at the current cursor position
	 * @param {String} dataUrl  The base64-encoded image URI
	 */
	insert(dataUrl) {
		const index =
			(this.quill.getSelection() || {}).index || this.quill.getLength();
		this.quill.insertEmbed(index, 'image', dataUrl, 'user');
	}

	/**
	 * callback on image upload succesfull
	 * @param {Any} response http response
	 */
	uploadImageCallbackOK(response, next) {
		next(response);
	}

	/**
	 * callback on image upload failed
	 * @param {Any} error http error
	 */
	uploadImageCallbackKO(error) {
		alert(error);
	}
}
