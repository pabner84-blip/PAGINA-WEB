/* =====================================================================
   EDITOR VISUAL de Casa Truper
   ---------------------------------------------------------------------
   Cambia los datos, los colores y las fotos de la pagina SIN escribir
   codigo. Escribe datos/ajustes.js y copia tus imagenes a la carpeta img/.

   Nada de esto se publica como codigo: los visitantes solo ven el
   resultado.
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. VALORES POR DEFECTO (si falta algo en ajustes.js)
     ------------------------------------------------------------------ */
  const DEF = {
    negocio: {
      nombre: 'FERRETERÍA',
      lema: 'Herramientas que sí sirven',
      descripcion: 'Herramientas manuales y eléctricas de las mejores marcas. Busca por nombre o por código y pídela directo por WhatsApp.',
      whatsapp: '',
      direccion: '',
      telefono: '',
      correo: '',
      mapa: '',
      horario: [
        { dia: 'Lunes a Viernes', hora: '9:00 – 18:00' },
        { dia: 'Sábado', hora: '9:00 – 14:00' },
        { dia: 'Domingo', hora: 'Cerrado', cerrado: true }
      ],
      mensajeWhatsApp: 'Hola, me interesa este producto:'
    },
    colores: { naranja: '#f97316', naranjaFuerte: '#ea580c', ambar: '#fbbf24' },
    imagenes: { logo: '', banner: '', marcas: {} },
    tusFotos: [],
    vitrina: { manuales: [], electricas: [] }
  };

  /* ------------------------------------------------------------------
     2. UTILIDADES
     ------------------------------------------------------------------ */
  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));

  function combinar(base, extra) {
    if (extra === undefined || extra === null) return base;
    if (Array.isArray(base)) return Array.isArray(extra) ? extra : base;
    if (typeof base !== 'object' || base === null) return extra;
    const salida = {};
    const claves = Object.keys(base).concat(Object.keys(extra));
    claves.forEach(function (k) {
      if (!(k in base)) { salida[k] = extra[k]; return; }
      salida[k] = (k in extra) ? combinar(base[k], extra[k]) : base[k];
    });
    return salida;
  }

  const CAMPO = (texto, valor) => String(texto == null ? '' : texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* ------------------------------------------------------------------
     3. ESTADO
     ------------------------------------------------------------------ */
  let A = null;                                   // ajustes actuales
  let carpeta = null;                             // carpeta del sitio
  const pendientes = new Map();                   // 'img/x.jpg' -> File
  const vistas = new Map();                       // 'img/x.jpg' -> URL de vista
  let puedeLeer = false;                          // fetch disponible
  let indiceHtml = null;                          // texto de index.html
  let esCelular = false;
  let pintando = false;                           // evita bucles al redibujar
  let modoEditor = false;                         // el marco ya habla postMessage
  let temporizador = null;
  const MARCAS_SUGERIDAS = ['TRUPER', 'INGCO', 'DYLLU', 'PRETUL'];
  const marcasExtra = [];                           // marcas que agrega el usuario

  function estado(texto, tipo) {
    const c = $('#estado');
    c.textContent = texto;
    c.className = 'estado' + (tipo ? ' ' + tipo : '');
  }

  function avisarError(e) {
    console.error(e);
    estado('No se pudo guardar: ' + (e && e.message ? e.message : e), 'error');
  }

  /* ------------------------------------------------------------------
     4. RECORDAR LA CARPETA (para no elegirla cada vez)
     ------------------------------------------------------------------ */
  function abrirIdb() {
    return new Promise(function (res, rej) {
      const r = indexedDB.open('casa-truper-editor', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  async function idbGuardar(clave, valor) {
    try {
      const db = await abrirIdb();
      await new Promise(function (res, rej) {
        const t = db.transaction('kv', 'readwrite');
        t.objectStore('kv').put(valor, clave);
        t.oncomplete = res; t.onerror = function () { rej(t.error); };
      });
    } catch (e) { /* no es grave */ }
  }
  async function idbLeer(clave) {
    try {
      const db = await abrirIdb();
      return await new Promise(function (res, rej) {
        const t = db.transaction('kv', 'readonly');
        const q = t.objectStore('kv').get(clave);
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { rej(q.error); };
      });
    } catch (e) { return null; }
  }

  /* ------------------------------------------------------------------
     5. ARCHIVOS (ZIP) - para descargar sin permiso de escritura
     ------------------------------------------------------------------ */
  const CRC = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(u8) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function fechaDos(d) {
    return {
      hora: ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31),
      dia: (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31)
    };
  }

  /* Crea un .zip (sin comprimir) con los archivos dados:
     [{ nombre: 'carpeta/archivo.jpg', datos: Uint8Array }] */
  function crearZip(archivos) {
    const enc = new TextEncoder();
    const dd = fechaDos(new Date());
    const trozos = [];
    const central = [];
    let desplazamiento = 0;

    archivos.forEach(function (a) {
      if (!a.datos) return;
      const nombre = enc.encode(a.nombre);
      const suma = crc32(a.datos);

      const lfh = new Uint8Array(30 + nombre.length);
      const lv = new DataView(lfh.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);          // nombres en UTF-8
      lv.setUint16(8, 0, true);              // metodo 0 = sin comprimir
      lv.setUint16(10, dd.hora, true);
      lv.setUint16(12, dd.dia, true);
      lv.setUint32(14, suma, true);
      lv.setUint32(18, a.datos.length, true);
      lv.setUint32(22, a.datos.length, true);
      lv.setUint16(26, nombre.length, true);
      lv.setUint16(28, 0, true);
      lfh.set(nombre, 30);

      const cdh = new Uint8Array(46 + nombre.length);
      const cv = new DataView(cdh.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, dd.hora, true);
      cv.setUint16(14, dd.dia, true);
      cv.setUint32(16, suma, true);
      cv.setUint32(20, a.datos.length, true);
      cv.setUint32(24, a.datos.length, true);
      cv.setUint16(28, nombre.length, true);
      cv.setUint16(30, 0, true);              // comentario
      cv.setUint16(32, 0, true);              // disco
      cv.setUint16(34, 0, true);              // atributos internos
      cv.setUint32(36, 0, true);              // atributos externos
      cv.setUint32(42, desplazamiento, true); // donde empieza el archivo
      cdh.set(nombre, 46);

      trozos.push(lfh, a.datos);
      central.push(cdh);
      desplazamiento += lfh.length + a.datos.length;
    });

    /* Fin del directorio central (EOCD): le dice al programa que abre el
       .zip cuántos archivos hay, dónde empiezan y cuánto miden. */
    const usados = trozos.reduce(function (s, t) { return s + t.byteLength; }, 0);
    const centralSize = central.reduce(function (s, c) { return s + c.length; }, 0);
    const fin = new Uint8Array(22);
    const fv = new DataView(fin.buffer);
    fv.setUint32(0, 0x06054b50, true);
    fv.setUint16(8, central.length, true);     // archivos en este disco
    fv.setUint16(10, central.length, true);    // archivos en total
    fv.setUint32(12, centralSize, true);
    fv.setUint32(16, usados, true);            // donde empieza el directorio

    return new Blob(trozos.concat(central, [fin]), { type: 'application/zip' });
  }

  function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2000);
  }

  async function bytesDe(file) {
    return new Uint8Array(await file.arrayBuffer());
  }

  function textoABytes(t) { return new TextEncoder().encode(t); }

  /* ------------------------------------------------------------------
     6. GUARDAR
     ------------------------------------------------------------------ */
  function serializar() {
    const o = {
      negocio: A.negocio,
      colores: A.colores,
      imagenes: A.imagenes,
      tusFotos: A.tusFotos,
      vitrina: A.vitrina
    };
    const cabecera = [
      '/* =====================================================================',
      '   AJUSTES DE CASA TRUPER',
      '   ---------------------------------------------------------------------',
      '   Este archivo lo modifico el EDITOR VISUAL (editor.html).',
      '   No hace falta abrirlo ni escribir codigo.',
      '',
      '   Si lo borras, la pagina sigue funcionando con los valores por defecto',
      '   que estan dentro de js/app.js.',
      '   ===================================================================== */',
      ''
    ].join('\n');
    return cabecera + 'window.AJUSTES = ' + JSON.stringify(o, null, 2) + ';\n';
  }

  async function escribirArchivo(handle, contenido) {
    const w = await handle.createWritable();
    await w.write(contenido);
    await w.close();
  }

  async function escribirEnCarpeta() {
    const carpetaDatos = await carpeta.getDirectoryHandle('datos', { create: true });
    await escribirArchivo(await carpetaDatos.getFileHandle('ajustes.js', { create: true }), serializar());

    if (pendientes.size) {
      const carpetaImg = await carpeta.getDirectoryHandle('img', { create: true });
      for (const [ruta, file] of pendientes) {
        const nombre = ruta.split('/').pop();
        await escribirArchivo(await carpetaImg.getFileHandle(nombre, { create: true }), await bytesDe(file));
      }
      pendientes.clear();
    }
  }

  /* El botón Guardar: escribe en la carpeta si hay una conectada y, si no,
     descarga un .zip con lo que falta guardar. */
  async function guardar() {
    try {
      clearTimeout(temporizador);
      if (carpeta) {
        await escribirEnCarpeta();
        estado('✔ Guardado en tu carpeta. Ya puedes subirla.', 'ok');
      } else {
        const archivos = [{ nombre: 'datos/ajustes.js', datos: textoABytes(serializar()) }];
        for (const [ruta, file] of pendientes) {
          archivos.push({ nombre: ruta, datos: await bytesDe(file) });
        }
        pendientes.clear();
        descargar(crearZip(archivos), 'casa-truper-cambios.zip');
        estado('Se descargó el .zip con tus cambios.', 'aviso');
        $('#notaZip').textContent =
          'Descomprime este .zip DENTRO de la carpeta "ferreteria" (pregunta si quieres reemplazar: sí). ' +
          'O más fácil: pulsa "Conectar carpeta" y todo se guarda solo.';
      }
      refrescarVista();
    } catch (e) { avisarError(e); }
  }

  /* Lo que pasa mientras escribes: NO descarga nada, solo actualiza la vista
     previa y, si la carpeta está conectada, guarda en silencio. */
  async function autoguardar() {
    try {
      if (carpeta) {
        await escribirEnCarpeta();
        estado('Guardado ✔', 'ok');
      } else {
        estado('Cambios sin guardar — pulsa 💾 Guardar (o conecta la carpeta)');
      }
      refrescarVista();
    } catch (e) { avisarError(e); }
  }

  function programar() {
    if (pintando) return;
    clearTimeout(temporizador);
    if (carpeta) estado('Guardando…');
    temporizador = setTimeout(autoguardar, 700);
  }

  /* ------------------------------------------------------------------
     7. VISTA PREVIA
     ------------------------------------------------------------------ */
  function ajustesParaVista() {
    const copia = JSON.parse(JSON.stringify(A));
    if (!carpeta) {
      // Sin permiso de escritura mostramos la foto como datos incrustados,
      // para que la vista previa muestre lo que vas a guardar.
      const incrustar = function (ruta) {
        if (!ruta || ruta.indexOf('img/') !== 0 || !pendientes.has(ruta)) return ruta;
        return URL.createObjectURL(pendientes.get(ruta));
      };
      copia.imagenes.logo = incrustar(copia.imagenes.logo);
      copia.imagenes.banner = incrustar(copia.imagenes.banner);
      const marcas = {};
      Object.keys(copia.imagenes.marcas || {}).forEach(function (k) {
        marcas[k] = incrustar(copia.imagenes.marcas[k]);
      });
      copia.imagenes.marcas = marcas;
      copia.tusFotos = (copia.tusFotos || []).map(function (f) {
        return Object.assign({}, f, { foto: incrustar(f.foto) });
      });
    }
    return copia;
  }

  function refrescarVista() {
    const marco = $('#preview');
    const listo = function () {
      $('#vistaPie').textContent = '✔ Listo. Los cambios se aplican al instante.';
    };

    /* Si la página dentro del marco avisó que entiende el modo editor,
       le mandamos los ajustes por postMessage: se actualiza al instante
       sin recargar los 1419 productos. */
    if (modoEditor) {
      try {
        marco.contentWindow.postMessage(
          { origen: 'editor-casa-truper', ajustes: ajustesParaVista() },
          '*'
        );
        listo();
        return;
      } catch (e) { modoEditor = false; }
    }

    if (puedeLeer && indiceHtml) {
      const base = '<base href="' + new URL('.', location.href).href + '">';
      const js = '<script>window.AJUSTES=' + JSON.stringify(ajustesParaVista()) + ';<\/script>';
      let html = indiceHtml.replace(
        /<script src=["']datos\/ajustes\.js["']><\/script>/,
        js
      );
      html = html.replace(/<head>/i, '<head>' + base);
      if (/<base href=/.test(html)) {
        marco.srcdoc = html;
        listo();
      } else {
        estado('No se pudo preparar la vista previa.', 'error');
      }
    } else {
      marco.removeAttribute('srcdoc');
      marco.src = 'index.html?t=' + Date.now();
      listo();
    }
  }

  /* ------------------------------------------------------------------
     8. DIBUJAR EL FORMULARIO
     ------------------------------------------------------------------ */
  function pintarFormulario() {
    pintando = true;
    Object.keys(DEF.negocio).forEach(function (clave) {
      if (clave === 'horario') return;
      const el = document.getElementById(clave);
      if (el) el.value = A.negocio[clave] == null ? '' : A.negocio[clave];
    });

    const colores = { naranja: '#c-naranja', naranjaFuerte: '#c-naranjaFuerte', ambar: '#c-ambar' };
    Object.keys(colores).forEach(function (k) {
      const el = $(colores[k]);
      el.value = A.colores[k];
      el.closest('.color').querySelector('code').textContent = A.colores[k];
    });

    $$('.imagen[data-slot]').forEach(function (caja) {
      const slot = caja.dataset.slot;
      const ruta = A.imagenes[slot] || '';
      caja.querySelector('.imagen__valor').textContent = ruta || 'ninguno';
      caja.querySelector('input[type="file"]').value = '';
    });

    pintarHorario();
    pintarMarcas();
    pintarFotos();
    pintando = false;
  }

  function pintarHorario() {
    const cont = $('#horario');
    cont.innerHTML = '';
    A.negocio.horario.forEach(function (h, i) {
      const fila = document.createElement('div');
      fila.className = 'fila' + (h.cerrado ? ' fila--cerrado' : '');
      fila.innerHTML =
        '<input type="text" data-campo="dia" placeholder="Día" value="' + CAMPO(h.dia) + '">' +
        '<input type="text" data-campo="hora" placeholder="8:00 – 20:00" value="' + CAMPO(h.hora) + '">' +
        '<button class="fila__quitar" type="button" title="Quitar este día">✕</button>';
      fila.querySelectorAll('input').forEach(function (inp) {
        inp.addEventListener('input', function () {
          A.negocio.horario[i][inp.dataset.campo] = inp.value;
          if (A.negocio.horario[i][inp.dataset.campo].trim()) delete A.negocio.horario[i].cerrado;
          fila.classList.remove('fila--cerrado');
          programar();
        });
      });
      fila.querySelector('.fila__quitar').addEventListener('click', function () {
        A.negocio.horario.splice(i, 1);
        pintarHorario(); programar();
      });
      cont.appendChild(fila);
    });
  }

  function pintarMarcas() {
    const cont = $('#marcas');
    const claves = [];
    const agregar = function (k) { if (k && claves.indexOf(k) === -1) claves.push(k); };
    Object.keys(A.imagenes.marcas || {}).forEach(agregar);
    MARCAS_SUGERIDAS.forEach(agregar);
    marcasExtra.forEach(agregar);
    cont.innerHTML = '';
    claves.forEach(function (clave) {
      cont.appendChild(filaMarca(clave, (A.imagenes.marcas || {})[clave] || ''));
    });
  }

  function filaMarca(clave, ruta) {
    const fila = document.createElement('div');
    fila.className = 'fila' + (ruta ? '' : ' fila--cerrado');
    fila.dataset.clave = clave;
    fila.innerHTML =
      '<input type="text" data-campo="clave" value="' + CAMPO(clave) + '" placeholder="TRUPER">' +
      '<div style="display:flex;gap:6px;align-items:center;min-width:0">' +
        '<input type="file" accept="image/*" data-file="marca" style="flex:1;min-width:0;font-size:12px">' +
      '</div>' +
      '<button class="fila__quitar" type="button" title="Quitar esta marca">✕</button>';
    const [campoClave, campoArchivo] = $$('input', fila);

    campoClave.addEventListener('input', function () {
      const nuevo = campoClave.value.trim().toUpperCase();
      const marcas = {};
      Object.keys(A.imagenes.marcas).forEach(function (k) {
        if (k === clave) {
          if (nuevo) marcas[nuevo] = A.imagenes.marcas[k];   // vacio = se borra
        } else {
          marcas[k] = A.imagenes.marcas[k];
        }
      });
      if (nuevo && !marcas[nuevo]) marcas[nuevo] = '';
      A.imagenes.marcas = marcas;
      fila.dataset.clave = nuevo;
      programar();
    });

    campoArchivo.addEventListener('change', function () {
      const file = campoArchivo.files && campoArchivo.files[0];
      if (!file) return;
      const nuevaClave = campoClave.value.trim().toUpperCase() || clave;
      ponerImagen('img/' + nombreArchivo(file, 'marca-'), file, function (ruta) {
        A.imagenes.marcas[nuevaClave] = ruta;
      }, function () { pintarMarcas(); });
    });

    fila.querySelector('.fila__quitar').addEventListener('click', function () {
      if (A.imagenes.marcas[clave]) delete A.imagenes.marcas[clave];
      pintarMarcas(); programar();
    });
    return fila;
  }

  function pintarFotos() {
    const cont = $('#tusFotos');
    cont.innerHTML = '';
    if (!A.tusFotos.length) {
      cont.innerHTML = '<p class="nota">Todavía no hay fotos. Presiona el botón de abajo para agregar la primera.</p>';
      return;
    }
    A.tusFotos.forEach(function (foto, i) {
      const miniatura = foto.foto
        ? '<img class="miniatura" src="' + CAMPO(foto.foto) + '" alt="">'
        : '<span class="miniatura miniatura--vacia">?</span>';
      const fila = document.createElement('div');
      fila.className = 'fila fila--foto';
      fila.innerHTML =
        '<div class="fila__top">' + miniatura +
          '<input type="file" accept="image/*" data-campo="archivo">' +
          '<button class="fila__quitar" type="button" title="Quitar esta foto">✕</button>' +
        '</div>' +
        '<input type="text" data-campo="titulo" placeholder="Título (ej: Taladro percutor)" value="' + CAMPO(foto.titulo) + '">' +
        '<input type="text" data-campo="busca" placeholder="Al tocarla, busca: taladro percutor" value="' + CAMPO(foto.busca) + '">' +
        '<input type="text" data-campo="url" placeholder="O llévala a otra parte: #contacto" value="' + CAMPO(foto.url) + '">' +
        '<small class="nota" style="font-size:11.5px">' + CAMPO(foto.foto || 'Sin foto todavía (elige el archivo de arriba)') + '</small>';

      $$('input[data-campo]', fila).forEach(function (inp) {
        if (inp.dataset.campo === 'archivo') return;
        inp.addEventListener('input', function () {
          A.tusFotos[i][inp.dataset.campo] = inp.value;
          programar();
        });
      });
      $('input[data-campo="archivo"]', fila).addEventListener('change', function () {
        const file = inpFile(this).files && inpFile(this).files[0];
        if (!file) return;
        ponerImagen('img/' + nombreArchivo(file, 'foto-'), file, function (ruta) {
          A.tusFotos[i].foto = ruta;
        }, function () { pintarFotos(); });
      });
      fila.querySelector('.fila__quitar').addEventListener('click', function () {
        A.tusFotos.splice(i, 1);
        pintarFotos(); programar();
      });
      cont.appendChild(fila);
    });
  }

  function inpFile(el) { return el; }

  /* ------------------------------------------------------------------
     9. IMAGENES
     ------------------------------------------------------------------ */
  function nombreArchivo(file, prefijo) {
    let base = (file.name || 'imagen').replace(/\.[a-z0-9]+$/i, '');
    base = base.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'imagen';
    if (file.name && /\.jpe?g|png|webp|gif|avif|svg$/i.test(file.name)) {
      /* conserva la extension */
    }
    const ext = (file.name.match(/\.([a-z0-9]+)$/i) || [, 'jpg'])[1].toLowerCase();
    return prefijo + base + '.' + ext;
  }

  function ponerImagen(ruta, file, asignar, alTerminar) {
    const destino = unico(ruta);
    pendientes.set(destino, file);
    vistas.set(destino, URL.createObjectURL(file));
    if (asignar) asignar(destino);
    if (carpeta) {
      guardar().then(function () { if (alTerminar) alTerminar(); });
    } else {
      if (alTerminar) alTerminar();
      programar();
    }
  }

  function unico(ruta) {
    let n = ruta;
    let i = 2;
    while (pendientes.has(n) && pendientes.get(n) !== null && n !== ruta) {
      n = ruta.replace(/(\.[a-z0-9]+)$/, '-' + i + '$1');
      i++;
    }
    return ruta;
  }

  /* ------------------------------------------------------------------
     10. CONECTAR LA CARPETA
     ------------------------------------------------------------------ */
  async function conectar() {
    if (!window.showDirectoryPicker) {
      estado('Tu navegador no deja escribir en la carpeta. Usa Chrome o Edge, o guarda con el .zip.', 'aviso');
      return;
    }
    try {
      carpeta = await window.showDirectoryPicker({ mode: 'readwrite', id: 'casa-truper-sitio' });
      await idbGuardar('carpeta', carpeta);
      await guardar();
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      avisarError(e);
    }
  }

  async function reconectar() {
    const guardada = await idbLeer('carpeta');
    if (!guardada || !guardada.queryPermission) return;
    const permiso = await guardada.queryPermission({ mode: 'readwrite' });
    if (permiso === 'granted') {
      carpeta = guardada;
      estado('Carpeta conectada: ' + carpeta.name, 'ok');
    } else {
      estado('Pulsa "Conectar carpeta" para poder guardar.', 'aviso');
    }
  }

  /* ------------------------------------------------------------------
     11. DESCARGAR .ZIP
     ------------------------------------------------------------------ */
  async function zipCambios() {
    const archivos = [{ nombre: 'datos/ajustes.js', datos: textoABytes(serializar()) }];
    for (const [ruta, file] of pendientes) archivos.push({ nombre: ruta, datos: await bytesDe(file) });
    if (pendientes.size) pendientes.clear();
    descargar(crearZip(archivos), 'casa-truper-cambios.zip');
    estado('Se descargó el .zip con tus cambios.', 'aviso');
    refrescarVista();
  }

  async function zipSitio() {
    estado('Empaquetando… 0%');
    try {
      if (!carpeta) {
        estado('Necesito leer la carpeta. Conéctala arriba a la derecha.', 'aviso');
        $('#notaZip').innerHTML = '<b>Para este botón:</b> pulsa primero ' +
          '<b>📂 Conectar carpeta</b> y elige la carpeta <code>ferreteria</code>. ' +
          'Ahí puedo leer las 1444 fotos y armar el .zip completo.<br><br>' +
          '<b>¿No te deja?</b> Los botones de arriba ("Solo mis cambios") no necesitan ' +
          'permiso. Para subir a internet arrastra la carpeta directamente a Netlify, ' +
          'que es m\u00e1s f\u00e1cil que un .zip.';
        return;
      }
      let permiso = await carpeta.queryPermission({ mode: 'readwrite' });
      if (permiso !== 'granted') permiso = await carpeta.requestPermission({ mode: 'readwrite' });
      if (permiso !== 'granted') {
        estado('El navegador no me dej\u00f3 leer la carpeta.', 'aviso');
        return;
      }

      const lista = [];
      await recorrer(carpeta, '', lista);
      if (!lista.length) { estado('La carpeta est\u00e1 vac\u00eda.', 'error'); return; }

      const hechos = [];
      for (let i = 0; i < lista.length; i++) {
        hechos.push({ nombre: 'ferreteria/' + lista[i].ruta, datos: new Uint8Array(await lista[i].file.arrayBuffer()) });
        if (i % 150 === 0 || i === lista.length - 1) {
          estado('Empaquetando\u2026 ' + Math.round((i + 1) / lista.length * 100) + '% (' + (i + 1) + ' archivos)');
          await new Promise(function (r) { setTimeout(r); });
        }
      }

      estado('Armando el .zip\u2026');
      const zip = crearZip(hechos);
      descargar(zip, 'casa-truper-sitio.zip');
      estado('\u2714 Listo: ' + hechos.length + ' archivos (' + Math.round(zip.size / 1048576) + ' MB). Revisa tu carpeta de Descargas.', 'ok');
    } catch (e) {
      estado('No se pudo crear el .zip: ' + (e && e.message ? e.message : e), 'error');
    }
  }

  async function recorrer(handle, prefijo, salida) {
    for await (const par of handle.values()) {
      if (par.kind === 'directory') {
        await recorrer(par, prefijo + par.name + '/', salida);
      } else {
        salida.push({ ruta: prefijo + par.name, file: await par.getFile() });
      }
    }
  }

  /* La página dentro del marco nos avisa cuando ya está lista para
     recibir cambios en vivo. */
  function escucharMarco() {
    window.addEventListener('message', function (ev) {
      if (!ev.data || ev.data.origen !== 'editor-casa-truper-listo') return;
      if (!modoEditor) {
        modoEditor = true;
        refrescarVista();
      }
    });
    $('#preview').addEventListener('load', function () {
      setTimeout(function () {
        if (!modoEditor) refrescarVista();
      }, 350);
    });
  }

  /* ------------------------------------------------------------------
     12. CONECTAR TODO
     ------------------------------------------------------------------ */
  function conectarEventos() {
    // campos sueltos
    Object.keys(DEF.negocio).forEach(function (clave) {
      if (clave === 'horario') return;
      const el = document.getElementById(clave);
      if (!el) return;
      el.addEventListener('input', function () {
        A.negocio[clave] = el.value;
        programar();
      });
    });

    // colores
    ['naranja', 'naranjaFuerte', 'ambar'].forEach(function (k) {
      const el = $('#c-' + k);
      el.addEventListener('input', function () {
        A.colores[k] = el.value;
        el.closest('.color').querySelector('code').textContent = el.value;
        programar();
      });
    });
    $('#btnColoresDefault').addEventListener('click', function () {
      A.colores = Object.assign({}, DEF.colores);
      pintarFormulario(); programar();
    });

    // mapa
    $('#btnMapa').addEventListener('click', function () {
      const dir = ($('#direccion').value || '').trim();
      if (!dir) { estado('Escribe primero la dirección.', 'aviso'); return; }
      const url = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(dir);
      $('#mapa').value = url;
      A.negocio.mapa = url;
      programar();
    });

    // logo y banner
    $$('.imagen[data-slot]').forEach(function (caja) {
      const slot = caja.dataset.slot;
      const campo = $('input[type="file"]', caja);
      campo.addEventListener('change', function () {
        const file = campo.files && campo.files[0];
        if (!file) return;
        ponerImagen('img/' + nombreArchivo(file, slot === 'logo' ? 'logo-' : 'portada-'), file, function (ruta) {
          A.imagenes[slot] = ruta;
        }, function () { pintarFormulario(); });
      });
      $('[data-quitar]', caja).addEventListener('click', function () {
        A.imagenes[slot] = '';
        pintarFormulario(); programar();
      });
    });

    // marcas y fotos: agregar
    $('#agregarMarca').addEventListener('click', function () {
      let n = 1;
      const usadas = Object.keys(A.imagenes.marcas).concat(MARCAS_SUGERIDAS, marcasExtra);
      while (usadas.indexOf('MARCA ' + n) !== -1) n++;
      marcasExtra.push('MARCA ' + n);
      pintarMarcas();
      const ultima = $('#marcas').lastElementChild;
      if (ultima) $('input[data-campo="clave"]', ultima).focus();
      programar();
    });
    $('#agregarHorario').addEventListener('click', function () {
      A.negocio.horario.push({ dia: '', hora: '' });
      pintarHorario(); programar();
    });
    $('#agregarFoto').addEventListener('click', function () {
      A.tusFotos.push({ foto: '', titulo: '', busca: '', url: '' });
      pintarFotos(); programar();
    });

    // vitrina
    $('#vManuales').addEventListener('input', function () { A.vitrina.manuales = this.value.split('\n').map(s => s.trim()).filter(Boolean); programar(); });
    $('#vElectricas').addEventListener('input', function () { A.vitrina.electricas = this.value.split('\n').map(s => s.trim()).filter(Boolean); programar(); });

    // barra
    $('#btnCarpeta').addEventListener('click', conectar);
    $('#btnGuardar').addEventListener('click', guardar);
    $('#btnZipCambios').addEventListener('click', zipCambios);
    $('#btnZipSitio').addEventListener('click', zipSitio);
    $('#btnRefrescar').addEventListener('click', refrescarVista);
    $('#btnEscena').addEventListener('click', function () {
      esCelular = !esCelular;
      $('#marco').classList.toggle('marco--celular', esCelular);
      this.textContent = esCelular ? '💻 Ver como computadora' : '📱 Ver como celular';
    });

    // avisos de que la vista previa se guarda sola
    window.addEventListener('beforeunload', function (e) {
      if (pendientes.size) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  /* ------------------------------------------------------------------
     13. ARRANCAR
     ------------------------------------------------------------------ */
  async function iniciar() {
    A = combinar(DEF, window.AJUSTES ? JSON.parse(JSON.stringify(window.AJUSTES)) : {});

    if (!A.imagenes.marcas || typeof A.imagenes.marcas !== 'object') A.imagenes.marcas = {};
    if (!Array.isArray(A.negocio.horario)) A.negocio.horario = DEF.negocio.horario.slice();
    if (!Array.isArray(A.vitrina.manuales)) A.vitrina.manuales = [];
    if (!Array.isArray(A.vitrina.electricas)) A.vitrina.electricas = [];
    if (!Array.isArray(A.tusFotos)) A.tusFotos = [];

    $('#vManuales').value = A.vitrina.manuales.join('\n');
    $('#vElectricas').value = A.vitrina.electricas.join('\n');

    pintarFormulario();
    conectarEventos();
    escucharMarco();

    try {
      const r = await fetch('index.html');
      if (r.ok) { indiceHtml = await r.text(); puedeLeer = true; }
    } catch (e) { puedeLeer = false; }

    refrescarVista();

    if (puedeLeer) {
      estado('Listo. Los cambios se ven al instante. Ctrl+S guarda.', 'ok');
    } else {
      estado('Listo. Para ver y guardar las fotos, pulsa "Conectar carpeta".', 'ok');
    }
    await reconectar();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
