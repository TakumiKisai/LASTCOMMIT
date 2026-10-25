// base './' = relative asset URLs, so the same build works on localhost AND on
// GitHub Pages under /LAST-COMMIT/ (an absolute '/assets/...' 404s there).
export default { base: './', build: { chunkSizeWarningLimit: 2000 } };
