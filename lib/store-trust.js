// Curated source-backed trust dossiers. Rechecked 2026-10-28.
// Colors describe documented evidence, not a guarantee of future delivery.
// Red is reserved for substantiated serious purchase risks, never for API downtime.
export const TRUST_PROFILES={
 okami:{
  level:'green',label:'Identidad comercial corroborada',checkedAt:'2026-10-28',
  summary:'Identidad y establecimiento contrastados mediante el comercio, datos registrales secundarios y una lista externa de distribuidores. Esto no garantiza seguridad del pago ni entregas.',
  positives:['OKAMI DEX E.I.R.L., RUC 20614610159: fuentes tributarias secundarias indican activo y habido.',
   'Domicilio de Miraflores coincide con el local anunciado y con una lista independiente de distribuidores.',
   'Web HTTPS, teléfono, correo y segunda sede publicados por el comercio.',
   'Un proveedor de accesorios GOSU incluye Okami Dex entre sus puntos de venta en Lima.'],
  cautions:['El RUC se ha contrastado en directorios secundarios; conviene confirmarlo directamente en SUNAT.',
   'La tienda incorpora un widget que anuncia 43 reseñas de Google, pero no hemos auditado directamente esa muestra; no lo presentamos como valoración independiente verificada.',
   'No se ha auditado el cumplimiento de pedidos ni la autenticidad de cada producto.'],
  ruc:'20614610159',
  sources:[
   {label:'Ficha comercial y dirección',url:'https://okamidex.pe/contacto/',type:'comercio'},
   {label:'RUC y estado declarado — Datos Perú',url:'https://www.datosperu.org/empresa-okami-dex-eirl-20614610159.php',type:'tercero'},
   {label:'Ficha empresarial — Universidad Perú',url:'https://www.universidadperu.com/empresas/okami-dex.php',type:'tercero'},
   {label:'Listado externo de puntos de venta GOSU',url:'https://gosuaccessories.com/donde-comprar',type:'tercero'},
   {label:'Ficha de ubicación Yandex Maps',url:'https://yandex.com/maps/org/okami_dex/51446411224/',type:'tercero'},
   {label:'Consulta oficial SUNAT (comprobar RUC)',url:'https://www.gob.pe/565-consulta-de-ruc/565-consulta-de-ruc',type:'oficial'}
  ],review:null,recommended:true,confidence:'moderada'
 },
 mazmorra:{
  level:'green',label:'Identidad y actividad corroboradas',checkedAt:'2026-10-27',
  summary:'Actividad de La Mazmorra TCG vinculada a una sociedad identificable, ubicación contrastada en terceros y presencia en directorios de juego.',
  positives:['Esports Events S.A.C. (RUC 20607953903) figura activa y habida en directorios empresariales.',
   'Tienda física documentada también en un directorio independiente de comercios TCG.',
   'Hay reseñas públicas de jugadores, aunque no se han verificado individualmente todas las compras.'],
  cautions:['Conviene verificar el RUC directamente en SUNAT y revisar las reseñas recientes antes de compras grandes.'],
  ruc:'20607953903',
  sources:[
   {label:'RUC y situación fiscal — Datos Perú',url:'https://www.datosperu.org/empresa-esports-events-sac-20607953903.php',type:'tercero'},
   {label:'Distribuidores TCG Binder',url:'https://tcgbinder.gg/tiendas',type:'tercero'},
   {label:'Comunidad y valoración TCG',url:'https://where2playtcg.com/pe/play/pokemon/santiago-de-surco',type:'tercero'},
   {label:'Sitio oficial',url:'https://lamazmorratcg.com/comprar/',type:'comercio'}
  ],review:{rating:4.7,count:28,source:'Where2PlayTCG',url:'https://where2playtcg.com/pe/play/pokemon/santiago-de-surco'},
  recommended:true,confidence:'moderada'
 },
 pokemillon:{
  level:'yellow',label:'Opiniones amplias, con algunas incidencias',checkedAt:'2026-10-27',
  summary:'Comercio identificable y con muchas reseñas, pero existen quejas recientes sobre pedidos y atención. Evaluar las opiniones más recientes antes de comprar.',
  positives:['Identidad comercial y dirección anunciadas en sitio propio y en Trustpilot.',
   'Elevado volumen de reseñas públicas que permite comparar experiencias diversas.'],
  cautions:['Aunque la valoración media es favorable, hay reseñas negativas sobre retrasos, precios y atención; conviene revisar las más recientes.',
   'No extrapolar opiniones sobre precios o retrasos a una acusación de fraude.'],
  sources:[
   {label:'Opiniones independientes — Trustpilot',url:'https://es.trustpilot.com/review/pokemillon.com',type:'tercero'},
   {label:'Reseñas recopiladas por el comercio',url:'https://www.pokemillon.com/pages/todas-las-resenas',type:'comercio'}
  ],review:{rating:4.3,count:1067,source:'Trustpilot',url:'https://es.trustpilot.com/review/pokemillon.com'},
  recommended:false,confidence:'moderada'
 },
 bimba:{
  level:'yellow',label:'Opiniones insuficientes',checkedAt:'2026-10-27',
  summary:'El sitio publica condiciones y contacto, pero la muestra independiente de opiniones es demasiado pequeña para una conclusión sólida.',
  positives:['Existen términos comerciales y medios de contacto publicados.'],
  cautions:['Trustpilot muestra solo tres opiniones; la puntuación no permite sacar conclusiones robustas.',
   'Confirmar datos legales y condiciones de devolución antes de pagar.'],
  sources:[
   {label:'Opiniones independientes — Trustpilot',url:'https://es.trustpilot.com/review/bimbacards.com',type:'tercero'},
   {label:'Condiciones comerciales',url:'https://bimbacards.com/condiciones-de-venta/',type:'comercio'}
  ],review:{rating:3.6,count:3,source:'Trustpilot',url:'https://es.trustpilot.com/review/bimbacards.com'},
  recommended:false,confidence:'baja'
 },
 khipu:{
  level:'yellow',label:'Actividad publicada; identidad pendiente',checkedAt:'2026-10-27',
  summary:'El comercio publica productos, contacto y un canal de pedidos, pero no se ha contrastado suficientemente su identidad registral ni un historial independiente de compras.',
  positives:['Sitio HTTPS, catálogo y canales de contacto publicados.'],
  cautions:['Sin RUC enlazado y contrastado aquí, ni muestra suficiente de opiniones externas.'],
  sources:[{label:'Sitio web y contacto',url:'https://khipuclubtcg.com/',type:'comercio'}],
  review:null,recommended:false,confidence:'baja'
 },
 noraku:{
  level:'yellow',label:'Identidad externa pendiente',checkedAt:'2026-10-27',
  summary:'El comercio publica sus condiciones de envío, devoluciones y preventa, pero falta una verificación externa independiente suficiente.',
  positives:['Web y condiciones de devolución publicadas.'],
  cautions:['No se ha contrastado una muestra representativa de opiniones independientes ni documentación registral suficiente.'],
  sources:[{label:'Preguntas frecuentes, envíos y devoluciones',url:'https://noraku.es/',type:'comercio'}],
  review:null,recommended:false,confidence:'baja'
 },
 theboosterbox:{
  level:'yellow',label:'Datos legales publicados; contraste pendiente',checkedAt:'2026-10-27',
  summary:'El sitio identifica una sociedad y CIF en su aviso legal; falta contrastar oficialmente esos datos y una muestra suficiente de opiniones.',
  positives:['Aviso legal con sociedad THE BOOSTER BOX SL, CIF B27533900 y datos de contacto.'],
  cautions:['Datos legales publicados por el propio comercio; no equivale a verificación mercantil oficial.',
   'Sin muestra suficiente de reseñas independientes corroboradas.'],
  sources:[{label:'Aviso legal del comercio',url:'https://theboosterbox.es/policies/legal-notice',type:'comercio'},
   {label:'Condiciones de atención',url:'https://theboosterbox.es/pages/preguntas-frecuentes',type:'comercio'}],
  review:null,recommended:false,confidence:'baja'
 }
};
export function trustForShop(id){
 const t=TRUST_PROFILES[id];
 if(t)return {...t,independentlyAudited:false};
 return {level:'yellow',label:'Pendiente de comprobación',checkedAt:null,
  summary:'Candidato encontrado o registrado: falta contrastar identidad legal, actividad y opiniones externas.',
  positives:[],cautions:['La presencia en mapas o el funcionamiento de un catálogo no garantizan la fiabilidad de compra.'],
  sources:[],review:null,recommended:false,confidence:'no evaluada',independentlyAudited:false};
}