export let wayTypeIcon = ((value) => {
  return `<svg class="${value}" viewBox="0 0 16 16" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <rect width="16" height="16" id="icon-bound" fill="none" />
    <path d="M15,3L15,4.268C15.598,4.614 16,5.26 16,6C16,7.104 15.104,8 14,8C12.896,8 12,7.104 12,6C12,5.26 12.402,4.614 13,4.268L13,3.5C13,2.672 12.328,2 11.5,2C10.672,2 10,2.672 10,3.5L10,12L10,12.013C9.993,14.215 8.203,16 6,16C3.792,16 2,14.208 2,12L2,11.829C0.835,11.417 0,10.305 0,9C0,7.344 1.344,6 3,6C4.656,6 6,7.344 6,9C6,10.305 5.165,11.417 4,11.829L4,12.006C4,12.108 4.008,12.21 4.024,12.311C4.049,12.471 4.094,12.629 4.157,12.778C4.254,13.008 4.395,13.219 4.569,13.397C4.736,13.568 4.933,13.709 5.15,13.81C5.336,13.898 5.535,13.957 5.739,13.983C5.958,14.012 6.181,14.004 6.397,13.961C6.583,13.923 6.764,13.859 6.932,13.77C7.13,13.665 7.311,13.527 7.464,13.362C7.615,13.2 7.738,13.014 7.828,12.812C7.898,12.654 7.948,12.487 7.975,12.317C7.992,12.212 8,12.106 8,12L8,3.5C8,1.568 9.568,0 11.5,0C13.262,0 14.721,1.305 14.964,3L15,3ZM3,8C2.448,8 2,8.448 2,9C2,9.552 2.448,10 3,10C3.552,10 4,9.552 4,9C4,8.448 3.552,8 3,8Z" />
  </svg>`
});

export let elevationIcon = ((value) => {
  return `<svg class="${value}" viewBox="0 0 16 16" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <rect width="16" height="16" id="icon-bound" fill="none" />
    <path d="M6.516,2.612L9.325,3.55l0.734,2.934l0.188,0.75l0.644,0.428l2.238,1.494L13.734,14H2.441l0.331-1.65l1.125-0.562 l0.875-0.438l0.191-0.959L6.516,2.612 M5,0L3,10l-2,1l-1,5h16l-1-8l-3-2l-1-4L5,0L5,0z" />
  </svg>`;
});

export let exportIcon = ((value) => {
  return `<svg class="${value}" viewBox="0 0 16 16" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <rect width="16" height="16" id="icon-bound" fill="none" />
    <path d="M10,6v2h3v6H3V8h3V6H1v10h14V6H10z M7,3.328V11h2V3.328l1.834,1.834L12,4L8,0L4,4l1.166,1.166L7,3.328z" />
  </svg>`;
});

export let elevationUpIcon = ((value) => {
  return `<svg class="${value}" viewBox="0 0 16 16" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <rect width="16" height="16" id="icon-bound" fill="none" />
    <path d="M4,4L10.586,4L0.979,13.607L2.393,15.021L12,5.414L12,12L14,12L14,2L4,2L4,4Z" />
  </svg>`;
});

export let elevationDownIcon = ((value) => {
  return `<svg class="${value}" viewBox="0 0 16 16" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <rect width="16" height="16" id="icon-bound" fill="none" />
    <path d="M12,4L12,10.586L2.393,0.979L0.979,2.393L10.586,12L4,12L4,14L14,14L14,4L12,4Z" />
  </svg>`;
});

export let distanceIcon = ((value) => {
  return `<svg ${value? `class="${value}"` : ``} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <path d="M406.6 374.6l96-96c12.5-12.5 12.5-32.8 0-45.3l-96-96c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 224l-293.5 0 41.4-41.4c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-96 96c-12.5 12.5-12.5 32.8 0 45.3l96 96c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.3 288l293.5 0-41.4 41.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0z"/>
  </svg>`;
});

export let markerIcon = ((value) => {
  return `<svg class="${value}" viewBox="0 0 16 16" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="16" height="16" id="icon-bound" fill="none" />
  <path d="M8,0C4.688,0,2,2.688,2,6c0,6,6,10,6,10s6-4,6-10C14,2.688,11.312,0,8,0z M8,8C6.344,8,5,6.656,5,5s1.344-3,3-3s3,1.344,3,3 S9.656,8,8,8z" />
</svg>`;
});

export let backIcon = ((value) => {
  return `<svg class="${value}" viewBox="0 0 16 16" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <rect width="16" height="16" id="icon-bound" fill="none" />
    <polygon points="5,8 10,3 10,13" />
  </svg>`
});

export let warningIcon = ((value) => {
  return `<svg class="${value}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="17" r="1" fill="#000000"/>
    <path d="M12 10L12 14" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3.44722 18.1056L10.2111 4.57771C10.9482 3.10361 13.0518 3.10362 13.7889 4.57771L20.5528 18.1056C21.2177 19.4354 20.2507 21 18.7639 21H5.23607C3.7493 21 2.78231 19.4354 3.44722 18.1056Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
});

export let trashIcon = ((value) => {
  return `<svg class="${value}" viewBox="0 0 16 16" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <rect width="16" height="16" id="icon-bound" fill="none" />
    <path d="M11,5h2v8.5c0,0.825-0.675,1.5-1.5,1.5h-7C3.675,15,3,14.325,3,13.5V5h2v8h2V5h2v8h2V5z M2,2h12v2H2V2z M6,0h4v1H6V0z" />
  </svg>`;
});