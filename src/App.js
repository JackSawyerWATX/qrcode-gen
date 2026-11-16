import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import './App.css';

function Icon({ name, size = 20 }) {
  const paths = { arrow: 'M7 17 17 7M7 7h10v10', download: 'M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5', link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2', check: 'm5 12 4 4L19 6', sparkle: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z' };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function App() {
  const [text, setText] = useState('https://example.com');
  const [content, setContent] = useState('https://example.com');
  const [size, setSize] = useState(400);
  const [background, setBackground] = useState('#ffffff');
  const [foreground, setForeground] = useState('#20251f');
  const [type, setType] = useState('URL');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [logo, setLogo] = useState(null);
  const [imageError, setImageError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    setError('');
    async function createCode() {
      try {
        const minimum = QRCode.create(content, { errorCorrectionLevel: 'H' }).version;
        const result = await QRCode.toDataURL(content, {
          version: Math.max(8, minimum),
          errorCorrectionLevel: 'H',
          width: size,
          margin: 4,
          color: { dark: foreground, light: background },
        });
        let output = result;
        if (logo) {
          const [qrImage, centerImage] = await Promise.all([loadImage(result), loadImage(logo.src)]);
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = size;
          const context = canvas.getContext('2d');
          context.drawImage(qrImage, 0, 0);
          const box = size * cornerSize(qrImage) * 1.2;
          context.fillStyle = background;
          context.fillRect((size - box) / 2, (size - box) / 2, box, box);
          const scale = Math.min(box / centerImage.width, box / centerImage.height);
          context.drawImage(centerImage, (size - centerImage.width * scale) / 2, (size - centerImage.height * scale) / 2, centerImage.width * scale, centerImage.height * scale);
          output = canvas.toDataURL('image/png');
        }
        if (!cancelled) setQrCode(output);
      } catch (error) {
        if (!cancelled) { setQrCode(''); setError(error.message || 'Could not create this code. Try shorter text.'); }
      } finally { if (!cancelled) setRendering(false); }
    }
    createCode();
    return () => { cancelled = true; };
  }, [content, size, foreground, background, logo]);
  async function uploadImage(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setImageError('Choose a PNG, JPG, or WebP image under 5 MB.');
      return;
    }
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await loadImage(data);
      setLogo({ src: data, name: file.name });
      setImageError('');
    } catch { setImageError('This image could not be opened. Try another file.'); }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function cornerSize(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    // The first row of a finder square is a solid seven-module run.
    const isInk = offset => Math.abs(data[offset] - data[0]) + Math.abs(data[offset + 1] - data[1]) + Math.abs(data[offset + 2] - data[2]) > 12;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (!isInk((y * canvas.width + x) * 4)) continue;
        let end = x;
        while (end < canvas.width && isInk((y * canvas.width + end) * 4)) end++;
        return (end - x) / canvas.width;
      }
    }
    throw new Error('QR corner could not be measured');
  }

  function generate(event) {
    event.preventDefault();
    if (!text.trim()) { setError('Add a link or some text to create your QR code.'); return; }
    setError('');
    setContent(text.trim());
  }

  async function download() {
    setDownloading(true);
    try {
      const anchor = document.createElement('a');
      anchor.href = qrCode;
      anchor.download = 'my-qr-code.png';
      anchor.click();

    } catch { setError('Could not download your code. Check your connection and try again.'); }
    finally { setDownloading(false); }
  }

  return (
    <div className="app">
      <header className="header"><a className="brand" href="/" aria-label="Qraft home"><span className="brand-mark">▦</span>qraft<span className="brand-dot">.</span></a><span className="header-note">A little square. Endless possibilities.</span><a className="header-link" href="#generator">Create a code <Icon name="arrow" size={16} /></a></header>
      <main>
        <section className="intro"><div className="eyebrow"><span /> SMALL CODE, BIG CONNECTIONS</div><h1>Make it scannable<span>.</span></h1><p>Turn your links and ideas into beautiful QR codes.<br />Make it yours. Download it. Share it with the world.</p></section>
        <section className="workspace" id="generator" aria-label="QR code generator">
          <form className="editor" onSubmit={generate}>
            <div className="section-heading"><span className="step">01</span><h2>Make it yours</h2></div>
            <label className="field-label">What would you like to share?</label>
            <div className="tabs" aria-label="Content type">{['URL', 'Text'].map(item => <button className={type === item ? 'tab active' : 'tab'} type="button" key={item} onClick={() => setType(item)}>{item === 'URL' ? <Icon name="link" size={16} /> : <span className="text-icon">Tt</span>}{item === 'URL' ? 'Website link' : 'Plain text'}</button>)}</div>
            <label htmlFor="content" className="sr-only">{type === 'URL' ? 'Website URL' : 'Text to encode'}</label>
            <textarea id="content" rows={2} value={text} onChange={event => setText(event.target.value)} placeholder={type === 'URL' ? 'https://your-website.com' : 'Your words go here…'} />
            <p className="field-hint">{type === 'URL' ? 'Send people somewhere worth discovering.' : 'A message, a note, or something worth sharing.'}</p>
            <div className="divider" />
            <div className="customize-heading"><h3>A touch of personality</h3><span>THE DETAILS</span></div>
            <div className="colors"><label className="color-control"><span>Code color</span><div><input aria-label="Code color" type="color" value={foreground} onChange={e => setForeground(e.target.value)} /><span>{foreground.toUpperCase()}</span></div></label><label className="color-control"><span>Background</span><div><input aria-label="Background color" type="color" value={background} onChange={e => setBackground(e.target.value)} /><span>{background.toUpperCase()}</span></div></label></div>
            <div className="size-label"><label htmlFor="size">Image size</label><span>{size} × {size} <small>px</small></span></div><input id="size" className="range" type="range" min="200" max="1600" step="50" value={size} onChange={e => setSize(Number(e.target.value))} /><div className="range-labels"><span>Small & handy</span><span>Big & crisp</span></div>
            <div className="logo-options">
              <div className="customize-heading"><h3>Center image</h3><span>OPTIONAL</span></div>
              <div className="logo-upload-row">
                {logo && <img className="logo-thumbnail" src={logo.src} alt="Selected center artwork" />}
                <label className="upload-button">{logo ? 'Replace image' : '+ Add an image'}<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadImage} /></label>
                {logo && <button type="button" className="remove-logo" onClick={() => { setLogo(null); setImageError(''); }}>Remove</button>}
              </div>
              <p className="field-hint">{logo ? logo.name : 'PNG, JPG, or WebP · Up to 5 MB. Images stay in your browser.'}</p>
              {logo && <p className="field-hint">Slightly larger than the corner squares. Your image keeps its original colors.</p>}
              {imageError && <p className="error" role="alert">{imageError}</p>}
            </div>
            <button className="generate" type="submit">Generate QR code <Icon name="arrow" /></button>
            {error && <p className="error" role="alert">{error}</p>}
          </form>
          <div className="preview"><div className="preview-top"><span className="eyebrow">YOUR NEXT CONNECTION</span><span className="live"><span /> Live preview</span></div><div className="qr-area"><span className="corner top-left" /><span className="corner top-right" /><span className="corner bottom-left" /><span className="corner bottom-right" /><div className="qr-paper" style={{ background }}><div className="qr-art">{qrCode && <img src={qrCode} alt={`QR code for ${content}`} />}</div></div></div><div className="preview-caption"><Icon name="sparkle" size={16} /><span aria-live="polite">{rendering ? 'Creating your code…' : 'Good things start with a scan.'}</span></div><button type="button" className="download" onClick={download} disabled={downloading || rendering || !qrCode}><Icon name="download" size={18} />{downloading ? 'Preparing download…' : 'Download PNG'}</button><p className="download-note">{size} × {size} px <span>·</span> Ready for print & digital</p></div>
        </section>
        <div className="benefits">{['Free to create, always', 'No sign-up needed', 'Yours to share anywhere'].map(label => <span key={label}><Icon name="check" size={15} />{label}</span>)}</div>
      </main>
      <footer><span>Made for moments that connect.</span><span>A simple tool. A world of possibilities. <span className="footer-star">✳</span></span></footer>
    </div>
  );
}

export default App;
