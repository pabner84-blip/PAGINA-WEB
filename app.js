/* =====================================================================
   CATALOGO DE FERRETERIA - logica de la pagina
   ---------------------------------------------------------------------
   NO NECESITAS EDITAR ESTE ARCHIVO.

   Los datos de tu ferreteria (nombre, WhatsApp, dirección, horario,
   colores, fotos y logos) estan en  datos/ajustes.js, que se modifica
   desde el EDITOR VISUAL (abre editor.html).

   Los valores de abajo solo se usan si datos/ajustes.js no existe o esta
   danado. Puedes dejarlos tranquilos.
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. VALORES POR DEFECTO (solo se usan si no hay ajustes.js)
     ------------------------------------------------------------------ */
  const POR_DEFECTO = {
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
        { dia: 'Sábado',          hora: '9:00 – 14:00' },
        { dia: 'Domingo',         hora: 'Cerrado', cerrado: true }
      ],
      mensajeWhatsApp: 'Hola, me interesa este producto:'
    },
    colores: {
      naranja: '#f97316',
      naranjaFuerte: '#ea580c',
      ambar: '#fbbf24'
    },
    imagenes: { logo: '', banner: '', marcas: {} },
    tusFotos: [],
    vitrina: { manuales: [], electricas: [] }
  };

  /* Junta los valores por defecto con los del editor. Lo que esté en
     ajustes.js gana; lo que no esté, se queda en el valor por defecto. */
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

  const AJUSTES = combinar(POR_DEFECTO, (typeof window !== 'undefined' ? window.AJUSTES : null));

  let NEGOCIO = AJUSTES.negocio;
  let COLORES = AJUSTES.colores;
  let IMAGENES = AJUSTES.imagenes;
  let TUS_FOTOS = AJUSTES.tusFotos || [];
  let VITRINA = AJUSTES.vitrina || { manuales: [], electricas: [] };

  /* ------------------------------------------------------------------
     2. UTILIDADES
     ------------------------------------------------------------------ */
  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* Red de seguridad: si algún producto llega sin categoría o sin marca,
     se muestra igual en vez de desaparecer de los filtros. */
  function completarDatos(lista) {
    return (Array.isArray(lista) ? lista : []).map(function (p) {
      return {
        codigo: p.codigo || '',
        nombre: p.nombre || 'Sin nombre',
        marca: (p.marca || '').trim() || 'Sin marca',
        categoria: (p.categoria || '').trim() || 'Sin categoría',
        codigoBarras: p.codigoBarras || '',
        caracteristicas: p.caracteristicas || '',
        imagen: p.imagen || '',
        galeria: Array.isArray(p.galeria) ? p.galeria : []
      };
    });
  }

  const CATALOGO = completarDatos(typeof PRODUCTOS !== 'undefined' ? PRODUCTOS : []);

  /* Emojis para las categorías. Se busca la PRIMERA palabra clave que
     aparezca dentro del nombre de la categoría, así que el orden importa. */
  const ICONOS = [
    [['alicate'], '🔧'],
    [['desarmador', 'punt screwdriver', 'destornillador'], '🪛'],
    [['martillo', 'mazo', 'combo'], '🔨'],
    [['taladro', 'atornillador', 'perforacion'], '🛠️'],
    [['broca'], '🌀'],
    [['punta'], '📌'],
    [['llave'], '🔑'],
    [['dado'], '🔧'],
    [['sierra', 'serrucho', 'corte'], '🪚'],
    [['disco', 'piedra', 'abrasivo', 'lija'], '⚙️'],
    [['tijera', 'cortador', 'cutter', 'navaja'], '✂️'],
    [['formon', 'carpinter', 'madera'], '🪵'],
    [['organizacion', 'almacenamiento', 'caja', 'estante'], '📦'],
    [['grapadora', 'remachadora'], '📎'],
    [['jardin', 'podadora', 'tijera de podar'], '🌿'],
    [['manguera', 'riego'], '💧'],
    [['fontaneria', 'plomeria', 'llave de agua'], '🚰'],
    [['pintura', 'brocha', 'rodillo'], '🎨'],
    [['adhesivo', 'sSellador', 'pegamento', 'silicona', 'cinta'], '🧴'],
    [['electricidad', 'electric', 'cable'], '💡'],
    [['iluminacion', 'lampara', 'foco'], '💡'],
    [['electronica', 'multimetro', 'probador'], '🔌'],
    [['soldadura', 'soplete', 'oxido'], '⚡'],
    [['medicion', 'nivelacion', 'cinta metrica', 'regla', 'escuadra', 'transportador'], '📏'],
    [['inspeccion', 'inspeccion'], '🔎'],
    [['seguridad'], '🦺'],
    [['automotriz', 'mecanica'], '🚗'],
    [['gato', 'elevacion', 'gato hidraulico'], '🔧'],
    [['neumatica', 'aire'], '💨'],
    [['prensa', 'sujetion', 'abrazadera', 'sujeta'], '🔗'],
    [['vidrio', 'azulejo'], '🪟'],
    [['afilar', 'mantenimiento', 'afilado'], '🧰'],
    [['lubricacion', 'lubricante', 'aceite'], '🛢️'],
    [['cincel', 'punzon'], '⛏️'],
    [['escobilla', 'limpieza', 'juego'], '🧹'],
    [['herramienta', 'accesorio', 'repuesto', 'combo de'], '🧰']
  ];

  const ICONO_GENICO = '🧰';

  /** Elige el emoji que mejor corresponde a un nombre de categoría. */
  function iconoCategoria(nombre) {
    const n = normalizar(nombre);
    for (let i = 0; i < ICONOS.length; i++) {
      const claves = ICONOS[i][0];
      for (let j = 0; j < claves.length; j++) {
        if (n.indexOf(claves[j]) !== -1) return ICONOS[i][1];
      }
    }
    return ICONO_GENICO;
  }

  /** Quita acentos y pasa a minusculas para buscar sin sorpresas. */
  function normalizar(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function sinAcentos(texto) {
    return normalizar(texto);
  }

  /** Convierte cualquier texto en un slug seguro para carpetas y querys. */
  function slug(texto) {
    return normalizar(texto)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  function numeroWhatsApp() {
    return String(NEGOCIO.whatsapp || '').replace(/[^\d]/g, '');
  }

  /** Mensaje de WhatsApp para un producto concreto. */
  function enlaceWhatsApp(producto) {
    const numero = numeroWhatsApp();
    if (!numero) return null;
    let mensaje = NEGOCIO.mensajeWhatsApp || 'Hola, me interesa este producto:';
    if (producto) {
      mensaje += '\n\n' + (producto.nombre || '');
      if (producto.codigo)     mensaje += '\nCódigo: ' + producto.codigo;
      if (producto.marca)      mensaje += '\nMarca: ' + producto.marca;
      if (producto.categoria)  mensaje += ' / ' + producto.categoria;
    }
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(mensaje);
  }

  function escapeHTML(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------------------------
     3. ESTADO DE LA PAGINA
     ------------------------------------------------------------------ */
  const POR_PAGINA = 24;

  const estado = {
    busqueda: '',
    marca: '',
    categoria: '',
    orden: 'nombre',
    visibles: POR_PAGINA,
    fotoActual: 0
  };

  let fichaProducto = null;

  /* Cache de texto buscable por producto (se calcula una sola vez). */
  let indiceBusqueda = [];
  let indicePorCodigo = {};

  function prepararIndice() {
    indiceBusqueda = CATALOGO.map(function (p) {
      const partes = [p.nombre, p.marca, p.categoria, p.codigo, p.codigoBarras, p.caracteristicas];
      return normalizar(partes.filter(Boolean).join(' '));
    });
    indicePorCodigo = {};
    CATALOGO.forEach(function (p) {
      const clave = normalizar(p.codigo);
      if (clave) indicePorCodigo[clave] = p;
    });
  }

  function buscarPorCodigo(codigo) {
    return indicePorCodigo[normalizar(codigo)] || null;
  }

  /* ------------------------------------------------------------------
     4. BUSQUEDA Y FILTROS
     ------------------------------------------------------------------ */
  function filtrar() {
    /* Cada palabra escrita tiene que aparecer en el producto.
       Así "alicate truper" encuentra los alicates de Truper, aunque
       esas dos palabras nunca estén pegadas en el nombre. */
    const palabras = normalizar(estado.busqueda).split(/\s+/).filter(Boolean);

    let resultados = [];
    for (let i = 0; i < CATALOGO.length; i++) {
      const p = CATALOGO[i];
      if (estado.marca && p.marca !== estado.marca) continue;
      if (estado.categoria && p.categoria !== estado.categoria) continue;

      if (palabras.length) {
        const texto = indiceBusqueda[i];
        let coincide = true;
        for (let j = 0; j < palabras.length; j++) {
          if (texto.indexOf(palabras[j]) === -1) { coincide = false; break; }
        }
        if (!coincide) continue;
      }
      resultados.push(p);
    }

    const colador = {
      'nombre':     (a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'),
      'nombre-desc':(a, b) => (b.nombre || '').localeCompare(a.nombre || '', 'es'),
      'marca':      (a, b) => (a.marca || '').localeCompare(b.marca || '', 'es') || (a.nombre || '').localeCompare(b.nombre || '', 'es'),
      'categoria':  (a, b) => (a.categoria || '').localeCompare(b.categoria || '', 'es') || (a.nombre || '').localeCompare(b.nombre || '', 'es')
    };
    resultados.sort(colador[estado.orden] || colador['nombre']);

    return resultados;
  }

  /* ------------------------------------------------------------------
     5. PINTADO
     ------------------------------------------------------------------ */
  function fotosDe(producto) {
    const lista = [];
    if (producto.imagen) lista.push(producto.imagen);
    if (Array.isArray(producto.galeria)) {
      producto.galeria.forEach(function (foto) {
        if (foto && lista.indexOf(foto) === -1) lista.push(foto);
      });
    }
    return lista;
  }

  function rutaFoto(foto) {
    if (!foto) return '';
    const limpio = String(foto).replace(/^[\/\\]+/, '');
    if (/^https?:\/\//i.test(limpio) || limpio.indexOf('data:') === 0) return limpio;
    return limpio;
  }

  function tarjetaProducto(producto, indice) {
    const fotos = fotosDe(producto);
    const principal = rutaFoto(fotos[0]);
    const codigo = escapeHTML(producto.codigo || '');
    const marca = escapeHTML(producto.marca || '');
    const nombre = escapeHTML(producto.nombre || 'Sin nombre');

    return '' +
      '<button class="producto revelar" data-indice="' + indice + '" type="button">' +
        '<div class="producto__foto">' +
          '<span class="producto__codigo">' + codigo + '</span>' +
          (fotos.length > 1 ? '<span class="producto__varias">+' + (fotos.length - 1) + '</span>' : '') +
          '<img src="' + principal + '" alt="' + nombre + '" loading="lazy" decoding="async" width="220" height="220">' +
        '</div>' +
        '<div class="producto__cuerpo">' +
          '<span class="producto__marca">' + marca + '</span>' +
          '<span class="producto__nombre">' + nombre + '</span>' +
          '<div class="producto__pie">' +
            '<span class="producto__precio">Ver precio</span>' +
            '<span class="producto__ver">Ver detalle &rsaquo;</span>' +
          '</div>' +
        '</div>' +
      '</button>';
  }

  function pintarProductos(resultados) {
    const rejilla = $('#rejillaProductos');
    const vacio = $('#sinResultados');
    const botonMas = $('#verMas');
    const visibles = resultados.slice(0, estado.visibles);

    if (!resultados.length) {
      rejilla.innerHTML = '';
      vacio.hidden = false;
      botonMas.hidden = true;
      actualizarTextoResultado(0);
      return;
    }

    rejilla.innerHTML = visibles.map(function (p, i) {
      return tarjetaProducto(p, CATALOGO.indexOf(p));
    }).join('');

    vacio.hidden = true;
    botonMas.hidden = resultados.length <= estado.visibles;
    botonMas.textContent = 'Ver más productos (' + Math.max(0, resultados.length - estado.visibles) + ' restantes)';

    actualizarTextoResultado(resultados.length);
    activarRevelar();
  }

  function actualizarTextoResultado(cantidad) {
    const $texto = $('#resultadoTexto');
    const $titulo = $('#tituloCatalogo');

    /* El título muestra todo lo que está activo, para que nunca te
       pierdas: "Alicates · TRUPER". */
    const partes = [];
    if (estado.categoria) partes.push(estado.categoria);
    if (estado.marca)    partes.push(estado.marca);
    if (partes.length) {
      $titulo.textContent = partes.join(' · ');
    } else if (estado.busqueda) {
      $titulo.textContent = 'Resultados de búsqueda';
    } else {
      $titulo.textContent = 'Todos los productos';
    }

    if (!cantidad) {
      $texto.textContent = 'Sin coincidencias';
    } else if (estado.busqueda || estado.marca || estado.categoria) {
      $texto.textContent = 'Mostrando ' + Math.min(estado.visibles, cantidad) + ' de ' + cantidad +
        (cantidad === 1 ? ' producto' : ' productos');
    } else {
      $texto.textContent = cantidad + (cantidad === 1 ? ' producto en catálogo' : ' productos en catálogo');
    }
  }

  function pintarCategorias() {
    const conteo = {};
    CATALOGO.forEach(function (p) {
      if (p.categoria) conteo[p.categoria] = (conteo[p.categoria] || 0) + 1;
    });

    const lista = Object.keys(conteo)
      .map(function (nombre) { return { nombre: nombre, total: conteo[nombre] }; })
      .sort(function (a, b) { return b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'); });

    $('#rejillaCategorias').innerHTML = lista.map(function (cat) {
      return '' +
        '<button class="categoria" data-categoria="' + escapeHTML(cat.nombre) + '" type="button">' +
          '<span class="categoria__icono" aria-hidden="true">' + iconoCategoria(cat.nombre) + '</span>' +
          '<span class="categoria__texto">' +
            '<span class="categoria__nombre">' + escapeHTML(cat.nombre) + '</span>' +
            '<span class="categoria__total">' + cat.total + (cat.total === 1 ? ' producto' : ' productos') + '</span>' +
          '</span>' +
        '</button>';
    }).join('');
  }

  function pintarMarcas() {
    const conteo = {};
    CATALOGO.forEach(function (p) {
      if (p.marca) conteo[p.marca] = (conteo[p.marca] || 0) + 1;
    });

    const lista = Object.keys(conteo)
      .map(function (nombre) { return { nombre: nombre, total: conteo[nombre] }; })
      .sort(function (a, b) { return b.total - a.total; });

    $('#rejillaMarcas').innerHTML = lista.map(function (m) {
      return '' +
        '<button class="marca-tarjeta" data-marca="' + escapeHTML(m.nombre) + '" type="button">' +
          '<div class="marca-tarjeta__marco"></div>' +
          '<div class="marca-tarjeta__nombre">' + escapeHTML(m.nombre) + '</div>' +
          '<div class="marca-tarjeta__total">' + m.total + (m.total === 1 ? ' producto' : ' productos') + '</div>' +
        '</button>';
    }).join('');
  }

  function pintarSelectores() {
    const marcas = {}, categorias = {};
    CATALOGO.forEach(function (p) {
      if (p.marca) marcas[p.marca] = true;
      if (p.categoria) categorias[p.categoria] = true;
    });

    const $marca = $('#filtroMarca');
    const $categoria = $('#filtroCategoria');

    Object.keys(marcas).sort().forEach(function (nombre) {
      const op = document.createElement('option');
      op.value = nombre; op.textContent = nombre;
      $marca.appendChild(op);
    });

    Object.keys(categorias).sort(function (a, b) { return a.localeCompare(b, 'es'); }).forEach(function (nombre) {
      const op = document.createElement('option');
      op.value = nombre; op.textContent = nombre;
      $categoria.appendChild(op);
    });
  }

  function pintarVitrina(contenedorId, codigos) {
    const $caja = $('#' + contenedorId);
    if (!$caja) return;

    const encontrados = [];
    codigos.forEach(function (codigo) {
      const p = buscarPorCodigo(codigo);
      if (p && p.imagen) encontrados.push(p);
    });

    if (!encontrados.length) { $caja.parentNode.style.display = 'none'; return; }

    $caja.innerHTML = encontrados.map(function (p, i) {
      return '' +
        '<button class="vitrina__foto revelar" style="animation-delay:' + (i * 45) + 'ms" ' +
          'type="button" data-producto="' + escapeHTML(p.codigo) + '" ' +
          'title="' + escapeHTML(p.nombre) + '">' +
          '<span class="vitrina__marco"><img src="' + rutaFoto(p.imagen) + '" alt="' +
            escapeHTML(p.nombre) + '" loading="lazy" decoding="async" width="96" height="96"></span>' +
          '<span class="vitrina__marca">' + escapeHTML(p.marca) + '</span>' +
          '<span class="vitrina__nombre">' + escapeHTML(p.nombre) + '</span>' +
        '</button>';
    }).join('');
  }

  function pintarVitrinaCompleta() {
    pintarVitrina('vitrinaManuales', VITRINA.manuales);
    pintarVitrina('vitrinaElectricas', VITRINA.electricas);
  }

  function pintarCifras() {
    const marcas = new Set();
    const categorias = new Set();
    CATALOGO.forEach(function (p) {
      if (p.marca) marcas.add(p.marca);
      if (p.categoria) categorias.add(p.categoria);
    });

    $('#cifraProductos').textContent  = CATALOGO.length.toLocaleString('es');
    $('#cifraMarcas').textContent    = marcas.size;
    $('#cifraCategorias').textContent = categorias.size;
    $('#contadorTotal').textContent  = CATALOGO.length.toLocaleString('es') + ' productos en catálogo';
    $('#anio').textContent = new Date().getFullYear();
  }

  function pintarEtiquetasActivas() {
    const cont = $('#etiquetasActivas');
    const partes = [];

    if (estado.busqueda) partes.push('<span>Búsqueda: <b>' + escapeHTML(estado.busqueda) + '</b></span>');
    if (estado.marca)    partes.push('<span>Marca: <b>' + escapeHTML(estado.marca) + '</b></span>');
    if (estado.categoria) partes.push('<span>Categoría: <b>' + escapeHTML(estado.categoria) + '</b></span>');

    if (!partes.length) { cont.hidden = true; cont.innerHTML = ''; return; }

    cont.hidden = false;
    cont.innerHTML =
      partes.map(function (t) {
        return '<button class="etiqueta-activa" type="button" data-quitar>' + t + ' &times;</button>';
      }).join('') +
      '<button class="etiqueta-activa" type="button" data-limpiar-todo>Limpiar todo</button>';
  }

  /* ------------------------------------------------------------------
     6. FICHA DE PRODUCTO
     ------------------------------------------------------------------ */
  function abrirFicha(producto) {
    if (!producto) return;
    fichaProducto = producto;
    estado.fotoActual = 0;

    const fotos = fotosDe(producto);

    $('#fichaMarca').textContent = producto.marca || '';
    $('#fichaMarca2').textContent = producto.marca || '—';
    $('#fichaCategoria').textContent = producto.categoria || '';
    $('#fichaCategoria2').textContent = producto.categoria || '—';
    $('#fichaNombre').textContent = producto.nombre || 'Sin nombre';
    $('#fichaCodigo').textContent = producto.codigo || '—';

    /* La mayoría de los productos no tienen código de barras:
       en ese caso se esconde la fila en vez de mostrar un guion. */
    const $filaBarras = $('#fichaFilaBarras');
    if (producto.codigoBarras && producto.codigoBarras.trim()) {
      $filaBarras.hidden = false;
      $('#fichaBarras').textContent = producto.codigoBarras;
    } else {
      $filaBarras.hidden = true;
    }

    const bloque = $('#fichaCaracteristicas');
    if (producto.caracteristicas) {
      bloque.hidden = false;
      $('#fichaCaracteristicasTxt').textContent = producto.caracteristicas;
    } else {
      bloque.hidden = true;
    }

    const $wa = $('#fichaWa');
    const enlace = enlaceWhatsApp(producto);
    if (enlace) {
      $wa.href = enlace;
      $wa.textContent = 'Pedir este producto por WhatsApp';
    } else {
      $wa.href = '#contacto';
      $wa.textContent = 'Configura tu WhatsApp para pedir este producto';
    }

    pintarFotos(fotos);

    $('#ficha').hidden = false;
    document.body.style.overflow = 'hidden';
    $('.ficha__cerrar').focus();
  }

  function pintarFotos(fotos) {
    const img = $('#fichaImg');
    img.alt = (fichaProducto && fichaProducto.nombre) || 'Producto';
    img.src = rutaFoto(fotos[0]);

    $('#fichaPrev').hidden = fotos.length < 2;
    $('#fichaNext').hidden = fotos.length < 2;

    $('#fichaPuntos').innerHTML = fotos.length > 1
      ? fotos.map(function (_, i) {
          return '<button class="ficha__punto' + (i === estado.fotoActual ? ' activo' : '') +
                 '" data-foto="' + i + '" type="button" aria-label="Foto ' + (i + 1) + '"></button>';
        }).join('')
      : '';
  }

  function cambiarFoto(delta) {
    if (!fichaProducto) return;
    const fotos = fotosDe(fichaProducto);
    if (fotos.length < 2) return;
    estado.fotoActual = (estado.fotoActual + delta + fotos.length) % fotos.length;
    pintarFotos(fotos);
  }

  function cerrarFicha() {
    $('#ficha').hidden = true;
    document.body.style.overflow = '';
    fichaProducto = null;
  }

  function mostrarAviso(texto) {
    const $aviso = $('#aviso');
    $aviso.textContent = texto;
    $aviso.hidden = false;
    clearTimeout($aviso._t);
    $aviso._t = setTimeout(function () { $aviso.hidden = true; }, 2600);
  }

  function copiarTexto(texto, mensajeExito) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto)
        .then(function () { mostrarAviso(mensajeExito); })
        .catch(function () { mostrarAviso('No se pudo copiar, anótalo a mano.'); });
    } else {
      mostrarAviso('Copia manual: ' + texto);
    }
  }

  /* ------------------------------------------------------------------
     7. APLICAR FILTROS
     ------------------------------------------------------------------ */
  function aplicar() {
    estado.visibles = POR_PAGINA;
    pintarProductos(filtrar());
    pintarEtiquetasActivas();
  }

  function irAlCatalogo() {
    const destino = document.getElementById('catalogo');
    if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fijarFiltro(campo, valor) {
    estado[campo] = valor;
    estado.visibles = POR_PAGINA;
    if (campo === 'marca'    && $('#filtroMarca'))    $('#filtroMarca').value = valor;
    if (campo === 'categoria' && $('#filtroCategoria')) $('#filtroCategoria').value = valor;
    aplicar();
    irAlCatalogo();
  }

  /* ------------------------------------------------------------------
     8. ANIMACIONES AL DESPLAZAR
     ------------------------------------------------------------------ */
  let observador = null;
  function activarRevelar() {
    if (!('IntersectionObserver' in window)) {
      $$('.revelar').forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    if (!observador) {
      observador = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observador.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -60px 0px', threshold: 0.05 });
    }
    $$('.revelar:not(.visible)').forEach(function (el) { observador.observe(el); });
  }

  /* ------------------------------------------------------------------
     9. TEMA CLARO / OSCURO
     ------------------------------------------------------------------ */
  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-tema', tema);
    try { localStorage.setItem('tema-catalogo', tema); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tema === 'oscuro' ? '#080c14' : '#f97316');
  }

  function iniciarTema() {
    var guardado = null;
    try { guardado = localStorage.getItem('tema-catalogo'); } catch (e) {}
    var preferido = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
    aplicarTema(guardado || preferido);
  }

  /* Pinta un logo propio si hay uno configurado; si el archivo no existe,
     vuelve a mostrar el ícono de llave inglesa. */
  function ponerLogo(selector, claseOcultar) {
    if (!IMAGENES.logo) return;
    const $caja = $(selector);
    if (!$caja) return;
    const $svg = $caja.querySelector('svg');
    const $img = $caja.querySelector('img');
    if (!$img) return;

    const probar = new Image();
    probar.onload = function () {
      $img.src = IMAGENES.logo;
      $img.removeAttribute('hidden');
      /* Ojo: un <svg> no tiene la propiedad "hidden", hay que usar
         removeAttribute. Con .hidden no funcionaba y se veían los dos. */
      if ($svg) $svg.setAttribute('hidden', '');
    };
    probar.onerror = function () {
      mostrarAviso('No se encontró ' + IMAGENES.logo + ' en la carpeta img');
    };
    probar.src = IMAGENES.logo;
  }

  /* Colores del diseño: se aplican sin tocar el CSS. */
  function aplicarColores() {
    const raiz = document.documentElement;
    if (COLORES.naranja)      raiz.style.setProperty('--naranja', COLORES.naranja);
    if (COLORES.naranjaFuerte) raiz.style.setProperty('--naranja-fuerte', COLORES.naranjaFuerte);
    if (COLORES.ambar)        raiz.style.setProperty('--ambar', COLORES.ambar);
  }

  /* Foto de fondo de la portada (si hay una configurada). */
  function ponerBanner() {
    if (!IMAGENES.banner) return;
    const $capa = $('#heroFoto');
    if (!$capa) return;
    const probar = new Image();
    probar.onload = function () { $capa.style.backgroundImage = 'url("' + IMAGENES.banner + '")'; };
    probar.onerror = function () { mostrarAviso('No se encontró ' + IMAGENES.banner + ' en la carpeta img'); };
    probar.src = IMAGENES.banner;
  }

  /* Fotos tuyas de la portada. */
  function pintarVitrinaTuya() {
    const lista = (TUS_FOTOS || []).filter(function (f) { return f && f.foto; });
    const $grupo = $('#vitrinaPropia');
    const $caja = $('#vitrinaTuya');
    if (!$grupo || !$caja) return;
    if (!lista.length) { $grupo.hidden = true; return; }

    $grupo.hidden = false;
    $caja.innerHTML = lista.map(function (f, i) {
      const accion = f.busca ? ' data-buscar="' + escapeHTML(f.busca) + '"'
                  : (f.url ? ' data-ir="' + escapeHTML(f.url) + '"' : '');
      return '' +
        '<button class="vitrina__foto vitrina__foto--tuyo revelar" style="animation-delay:' + (i * 45) + 'ms" ' +
          'type="button"' + accion + ' title="' + escapeHTML(f.titulo || '') + '">' +
          '<span class="vitrina__marco"><img src="' + escapeHTML(f.foto) + '" alt="' +
            escapeHTML(f.titulo || 'Foto de la ferretería') + '" loading="lazy" decoding="async"></span>' +
          '<span class="vitrina__nombre">' + escapeHTML(f.titulo || '') + '</span>' +
        '</button>';
    }).join('');
  }

  /* Logotipos de las marcas: si hay uno configurado, se muestra la imagen;
     si no, se queda el nombre en letras, como siempre. */
  function ponerLogosMarcas() {
    const configurados = IMAGENES.marcas || {};
    if (!Object.keys(configurados).length) return;

    $$('.marca-tarjeta').forEach(function (tarjeta) {
      const nombre = tarjeta.dataset.marca;
      const ruta = configurados[nombre];
      if (!ruta) return;

      const probar = new Image();
      probar.onload = function () {
        const marco = tarjeta.querySelector('.marca-tarjeta__marco');
        marco.innerHTML = '<img src="' + ruta + '" alt="' + escapeHTML(nombre) + '" loading="lazy">';
      };
      probar.src = ruta;
    });
  }

  /* ------------------------------------------------------------------
     10. DATOS DEL NEGOCIO EN LA PAGINA
     ------------------------------------------------------------------ */
  function pintarNegocio() {
    $$('[data-neg]').forEach(function (el) {
      const valor = NEGOCIO[el.getAttribute('data-neg')];
      if (valor) el.textContent = valor;
    });

    const $horario = $('#horario');
    if ($horario && Array.isArray(NEGOCIO.horario)) {
      $horario.innerHTML = NEGOCIO.horario.map(function (h) {
        return '<li><b>' + escapeHTML(h.dia) + '</b><span' +
          (h.cerrado ? ' class="cerrado"' : '') + '>' + escapeHTML(h.hora) + '</span></li>';
      }).join('');
    }

    const $dir = $('#direccionEnlace');
    if ($dir) {
      if (NEGOCIO.direccion && !/^Agrega/.test(NEGOCIO.direccion)) {
        $dir.textContent = NEGOCIO.direccion;
        /* Al tocar la dirección se abre el mapa para llegar fácil. */
        $dir.setAttribute('href',
          'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(NEGOCIO.direccion));
      } else {
        $dir.removeAttribute('target');
        $dir.setAttribute('href', '#contacto');
      }
    }

    const $tel = $('#telefonoEnlace');
    if ($tel) {
      if (NEGOCIO.telefono) { $tel.textContent = NEGOCIO.telefono; $tel.href = 'tel:' + NEGOCIO.telefono.replace(/[^\d+]/g, ''); }
      else { $tel.textContent = 'Agrega aquí tu teléfono'; }
    }

    const $correo = $('#correoEnlace');
    if ($correo) {
      if (NEGOCIO.correo) { $correo.textContent = NEGOCIO.correo; $correo.href = 'mailto:' + NEGOCIO.correo; }
      else { $correo.textContent = 'Agrega aquí tu correo'; }
    }

    const $mapa = $('#mapaEnlace');
    if ($mapa) {
      if (NEGOCIO.mapa) {
        $mapa.setAttribute('href', NEGOCIO.mapa);
        $mapa.style.display = '';
      } else {
        $mapa.style.display = 'none';
      }
    }

    // Botones de WhatsApp generales
    const avisoFaltaWa = function (ev) {
      ev.preventDefault();
      mostrarAviso('Agrega tu número de WhatsApp en el editor (editor.html)');
    };

    $$('.btn--wa, #waSinResultados').forEach(function (btn) {
      if (btn.id === 'fichaWa') return;                 // la ficha arma su propio enlace
      const enlace = enlaceWhatsApp(null);
      if (enlace) {
        btn.setAttribute('href', enlace);
        btn.removeEventListener('click', avisoFaltaWa);
      } else {
        btn.setAttribute('href', '#contacto');
        btn.addEventListener('click', avisoFaltaWa);
      }
    });

    const $waFlotante = $('#waFlotante');
    if ($waFlotante) {
      const enlace = enlaceWhatsApp(null);
      if (enlace) {
        $waFlotante.setAttribute('href', enlace);
        $waFlotante.removeEventListener('click', avisoFaltaWa);
      } else {
        $waFlotante.setAttribute('href', '#contacto');
        $waFlotante.addEventListener('click', avisoFaltaWa);
      }
    }
  }

  /* ------------------------------------------------------------------
     11. EVENTOS
     ------------------------------------------------------------------ */
  function conectarEventos() {
    const $busqueda = $('#busqueda');
    const $limpiar  = $('#limpiar');

    $busqueda.addEventListener('input', function () {
      estado.busqueda = this.value;
      $limpiar.hidden = !this.value;
      aplicar();
    });

    $limpiar.addEventListener('click', function () {
      $busqueda.value = '';
      estado.busqueda = '';
      this.hidden = true;
      aplicar();
      $busqueda.focus();
    });

    // Atajo "/" para buscar rápido
    document.addEventListener('keydown', function (ev) {
      if (ev.key === '/' && document.activeElement !== $busqueda && !ev.metaKey && !ev.ctrlKey) {
        ev.preventDefault();
        $busqueda.focus();
        $busqueda.select();
      }
      if (ev.key === 'Escape' && !$('#ficha').hidden) cerrarFicha();
    });

    // Chips de ejemplo
    $$('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        $busqueda.value = this.dataset.ejemplo;
        estado.busqueda = this.dataset.ejemplo;
        $limpiar.hidden = false;
        aplicar();
        irAlCatalogo();
      });
    });

    // Selectores
    $('#filtroMarca').addEventListener('change', function () {
      estado.marca = this.value; aplicar();
    });
    $('#filtroCategoria').addEventListener('change', function () {
      estado.categoria = this.value; aplicar();
    });
    $('#orden').addEventListener('change', function () {
      estado.orden = this.value; estado.visibles = POR_PAGINA; pintarProductos(filtrar());
    });

    // Categorías y marcas (delegación)
    document.addEventListener('click', function (ev) {
      const cat = ev.target.closest('[data-categoria]');
      if (cat) { fijarFiltro('categoria', cat.dataset.categoria); return; }

      const mar = ev.target.closest('[data-marca]');
      if (mar) { fijarFiltro('marca', mar.dataset.marca); return; }

      const prod = ev.target.closest('.producto');
      if (prod) { abrirFicha(CATALOGO[parseInt(prod.dataset.indice, 10)]); return; }

      /* Fotos de la portada: abren el producto que muestran. */
      const fotoVitrina = ev.target.closest('[data-producto]');
      if (fotoVitrina) {
        const elegido = buscarPorCodigo(fotoVitrina.dataset.producto);
        if (elegido) abrirFicha(elegido);
        return;
      }

      /* Fotos propias: buscan en el catálogo o saltan a una sección. */
      const fotoTuya = ev.target.closest('[data-buscar]');
      if (fotoTuya) {
        const $b = $('#busqueda');
        $b.value = fotoTuya.dataset.buscar;
        estado.busqueda = fotoTuya.dataset.buscar;
        $('#limpiar').hidden = false;
        aplicar();
        irAlCatalogo();
        return;
      }
      const salto = ev.target.closest('[data-ir]');
      if (salto) {
        const destino = document.querySelector(salto.dataset.ir);
        if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      if (ev.target.closest('[data-quitar]')) {
        if (estado.busqueda) { estado.busqueda = ''; $('#busqueda').value = ''; $('#limpiar').hidden = true; }
        if (estado.marca)    { estado.marca = ''; $('#filtroMarca').value = ''; }
        if (estado.categoria) { estado.categoria = ''; $('#filtroCategoria').value = ''; }
        aplicar();
        return;
      }

      if (ev.target.closest('[data-limpiar-todo]')) {
        estado.busqueda = ''; estado.marca = ''; estado.categoria = '';
        $('#busqueda').value = ''; $('#limpiar').hidden = true;
        $('#filtroMarca').value = ''; $('#filtroCategoria').value = '';
        aplicar();
        return;
      }

      if (ev.target.closest('[data-cerrar]')) { cerrarFicha(); }
    });

    // Ficha: fotos, copiar
    $('#fichaPrev').addEventListener('click', function () { cambiarFoto(-1); });
    $('#fichaNext').addEventListener('click', function () { cambiarFoto(1); });
    $('#fichaPuntos').addEventListener('click', function (ev) {
      const punto = ev.target.closest('[data-foto]');
      if (!punto) return;
      estado.fotoActual = parseInt(punto.dataset.foto, 10);
      if (fichaProducto) pintarFotos(fotosDe(fichaProducto));
    });
    $('#fichaCopiar').addEventListener('click', function () {
      if (!fichaProducto) return;
      const texto = fichaProducto.nombre + (fichaProducto.codigo ? '\nCódigo: ' + fichaProducto.codigo : '');
      copiarTexto(texto, 'Nombre y código copiados ✔');
    });

    // Más productos
    $('#verMas').addEventListener('click', function () {
      estado.visibles += POR_PAGINA;
      pintarProductos(filtrar());
    });

    // Vaciar todo
    $('#vaciarTodo').addEventListener('click', function () {
      estado.busqueda = ''; estado.marca = ''; estado.categoria = '';
      $('#busqueda').value = ''; $('#limpiar').hidden = true;
      $('#filtroMarca').value = ''; $('#filtroCategoria').value = '';
      aplicar();
    });

    // Tema
    $('#tema').addEventListener('click', function () {
      const actual = document.documentElement.getAttribute('data-tema');
      aplicarTema(actual === 'oscuro' ? 'claro' : 'oscuro');
    });

    // Menú móvil
    const $hamburguesa = $('#hamburguesa');
    const $nav = $('#nav');
    $hamburguesa.addEventListener('click', function () {
      const abierto = $nav.classList.toggle('abierto');
      this.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
    $$('#nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        $nav.classList.remove('abierto');
        $hamburguesa.setAttribute('aria-expanded', 'false');
      });
    });

    // Resaltar la sección actual del menú
    const secciones = ['inicio', 'categorias', 'marcas', 'catalogo', 'contacto'];
    if ('IntersectionObserver' in window) {
      const espia = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) return;
          $$('#nav a').forEach(function (a) {
            a.classList.toggle('resaltado', a.getAttribute('href') === '#' + e.target.id);
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      secciones.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) espia.observe(el);
      });
    }

    // Sombra de la cabecera al bajar
    window.addEventListener('scroll', function () {
      $('#cabecera').classList.toggle('activa', window.scrollY > 10);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     12. ARRANQUE
     ------------------------------------------------------------------ */
  function iniciar() {
    iniciarTema();
    aplicarColores();
    pintarNegocio();
    ponerLogo('.cabecera .marca__logo');
    ponerLogo('.marca__logo--pie');
    ponerBanner();

    if (!CATALOGO.length) {
      $('#cargando').hidden = true;
      $('#sinResultados').hidden = false;
      $('#sinResultados').querySelector('h3').textContent = 'No se cargó el catálogo';
      $('#sinResultados').querySelector('p').textContent = 'Revisa que exista el archivo datos/productos.js';
      return;
    }

    prepararIndice();
    pintarCifras();
    pintarVitrinaCompleta();
    pintarVitrinaTuya();
    pintarCategorias();
    pintarMarcas();
    ponerLogosMarcas();
    pintarSelectores();
    pintarProductos(filtrar());
    $('#cargando').hidden = true;

    conectarEventos();
    activarModoEditor();
  }

  /* ------------------------------------------------------------------
     13. MODO EDITOR
     ------------------------------------------------------------------
     Cuando esta pagina se muestra dentro del editor visual, el editor
     nos manda los ajustes nuevos por postMessage y los aplicamos al
     instante, sin recargar los 1419 productos. En la pagina normal
     (publicada) este bloque no hace nada.                                */
  function activarModoEditor() {
    if (window.parent === window) return;

    window.addEventListener('message', function (ev) {
      const dato = ev.data;
      if (!dato || dato.origen !== 'editor-casa-truper') return;

      Object.assign(NEGOCIO, dato.ajustes.negocio);
      Object.assign(COLORES, dato.ajustes.colores);
      Object.assign(IMAGENES, dato.ajustes.imagenes);
      Object.assign(IMAGENES.marcas, dato.ajustes.imagenes.marcas || {});
      TUS_FOTOS.length = 0;
      (dato.ajustes.tusFotos || []).forEach(function (f) { TUS_FOTOS.push(f); });
      Object.assign(VITRINA, dato.ajustes.vitrina);

      document.title = NEGOCIO.nombre + ' | Ferretería — Catálogo de herramientas';
      aplicarColores();
      pintarNegocio();
      ponerLogo('.cabecera .marca__logo');
      ponerLogo('.marca__logo--pie');
      ponerBanner();
      pintarVitrinaCompleta();
      pintarVitrinaTuya();
      pintarCategorias();
      pintarMarcas();
      ponerLogosMarcas();
      pintarSelectores();
      pintarProductos(filtrar());

      ev.source && ev.source.postMessage({ origen: 'editor-casa-truper-listo' }, '*');
    });

    window.parent.postMessage({ origen: 'editor-casa-truper-listo' }, '*');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
