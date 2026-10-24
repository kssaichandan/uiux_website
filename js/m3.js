// Material 3 colour scheme from a seed colour (CAM16/HCT, tonalSpot).
// Copied from tools/figma-plugin/src/00-m3.js so the web app matches the phone app.
(function () {
var SRGB_TO_XYZ = [
  [0.41233895, 0.35762064, 0.18051042],
  [0.2126, 0.7152, 0.0722],
  [0.01932141, 0.11916382, 0.95034478],
];

var XYZ_TO_SRGB = [
  [3.2413774792388685, -1.5376652402851851, -0.49885366846268053],
  [-0.9691452513005321, 1.8758853451067872, 0.04156585616912061],
  [0.05562093689691305, -0.20395524564742123, 1.0571799111220335],
];

var WHITE_POINT_D65 = [95.047, 100.0, 108.883];

function matMul(row, matrix) {
  return [
    row[0] * matrix[0][0] + row[1] * matrix[0][1] + row[2] * matrix[0][2],
    row[0] * matrix[1][0] + row[1] * matrix[1][1] + row[2] * matrix[1][2],
    row[0] * matrix[2][0] + row[1] * matrix[2][1] + row[2] * matrix[2][2],
  ];
}

// 8-bit sRGB channel -> linear, on material's 0..100 scale.
function linearized(rgb8) {
  var normalized = rgb8 / 255.0;
  if (normalized <= 0.040449936) return (normalized / 12.92) * 100.0;
  return Math.pow((normalized + 0.055) / 1.055, 2.4) * 100.0;
}

// linear (0..100) -> 8-bit sRGB channel.
function delinearized(rgbLinear) {
  var normalized = rgbLinear / 100.0;
  var delin;
  if (normalized <= 0.0031308) delin = normalized * 12.92;
  else delin = 1.055 * Math.pow(normalized, 1.0 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(delin * 255.0)));
}

function labF(t) {
  var e = 216.0 / 24389.0;
  var kappa = 24389.0 / 27.0;
  if (t > e) return Math.pow(t, 1.0 / 3.0);
  return (kappa * t + 16.0) / 116.0;
}

function labInvf(ft) {
  var e = 216.0 / 24389.0;
  var kappa = 24389.0 / 27.0;
  var ft3 = ft * ft * ft;
  if (ft3 > e) return ft3;
  return (116.0 * ft - 16.0) / kappa;
}

// L* is a pure function of Y, which is what makes tone exactly solvable below.
function yFromLstar(lstar) {
  return 100.0 * labInvf((lstar + 16.0) / 116.0);
}

function lstarFromY(y) {
  return 116.0 * labF(y / 100.0) - 16.0;
}

function argbFromRgb(r, g, b) {
  return ((255 << 24) | ((r & 255) << 16) | ((g & 255) << 8) | (b & 255)) >>> 0;
}

function redFromArgb(argb) { return (argb >> 16) & 255; }
function greenFromArgb(argb) { return (argb >> 8) & 255; }
function blueFromArgb(argb) { return argb & 255; }

function xyzFromArgb(argb) {
  return matMul(
    [linearized(redFromArgb(argb)), linearized(greenFromArgb(argb)), linearized(blueFromArgb(argb))],
    SRGB_TO_XYZ
  );
}

// A neutral grey at the requested tone; used when chroma is unreachable.
function argbFromLstar(lstar) {
  var component = delinearized(yFromLstar(lstar));
  return argbFromRgb(component, component, component);
}

function sanitizeDegrees(degrees) {
  degrees = degrees % 360.0;
  if (degrees < 0) degrees += 360.0;
  return degrees;
}

// --- CAM16 viewing conditions ------------------------------------------------

function makeViewingConditions() {
  var whitePoint = WHITE_POINT_D65;
  var adaptingLuminance = (200.0 / Math.PI) * yFromLstar(50.0) / 100.0;
  var backgroundLstar = 50.0;
  var surround = 2.0;

  var rW = whitePoint[0] * 0.401288 + whitePoint[1] * 0.650173 + whitePoint[2] * -0.051461;
  var gW = whitePoint[0] * -0.250268 + whitePoint[1] * 1.204414 + whitePoint[2] * 0.045854;
  var bW = whitePoint[0] * -0.002079 + whitePoint[1] * 0.048952 + whitePoint[2] * 0.953127;

  var f = 0.8 + surround / 10.0;
  var c = f >= 0.9
    ? 0.59 + (0.69 - 0.59) * ((f - 0.9) * 10.0)
    : 0.525 + (0.59 - 0.525) * ((f - 0.8) * 10.0);
  var d = 1.0 - (1.0 / 3.6) * Math.exp((-adaptingLuminance - 42.0) / 92.0);
  d = d > 1.0 ? 1.0 : (d < 0.0 ? 0.0 : d);
  var nc = f;

  var rgbD = [
    d * (100.0 / rW) + 1.0 - d,
    d * (100.0 / gW) + 1.0 - d,
    d * (100.0 / bW) + 1.0 - d,
  ];

  var k = 1.0 / (5.0 * adaptingLuminance + 1.0);
  var k4 = k * k * k * k;
  var k4F = 1.0 - k4;
  var fl = k4 * adaptingLuminance + 0.1 * k4F * k4F * Math.pow(5.0 * adaptingLuminance, 1.0 / 3.0);

  var n = yFromLstar(backgroundLstar) / whitePoint[1];
  var z = 1.48 + Math.sqrt(n);
  var nbb = 0.725 / Math.pow(n, 0.2);
  var ncb = nbb;

  var rgbAFactors = [
    Math.pow((fl * rgbD[0] * rW) / 100.0, 0.42),
    Math.pow((fl * rgbD[1] * gW) / 100.0, 0.42),
    Math.pow((fl * rgbD[2] * bW) / 100.0, 0.42),
  ];
  var rgbA = [
    (400.0 * rgbAFactors[0]) / (rgbAFactors[0] + 27.13),
    (400.0 * rgbAFactors[1]) / (rgbAFactors[1] + 27.13),
    (400.0 * rgbAFactors[2]) / (rgbAFactors[2] + 27.13),
  ];
  var aw = ((40.0 * rgbA[0] + 20.0 * rgbA[1] + rgbA[2]) / 20.0) * nbb;

  return { n: n, aw: aw, nbb: nbb, ncb: ncb, c: c, nc: nc, rgbD: rgbD, fl: fl,
           flRoot: Math.pow(fl, 0.25), z: z };
}

var VC = makeViewingConditions();

// --- forward: ARGB -> HCT ----------------------------------------------------

function cam16FromXyz(x, y, z) {
  var rC = 0.401288 * x + 0.650173 * y - 0.051461 * z;
  var gC = -0.250268 * x + 1.204414 * y + 0.045854 * z;
  var bC = -0.002079 * x + 0.048952 * y + 0.953127 * z;

  var rD = VC.rgbD[0] * rC, gD = VC.rgbD[1] * gC, bD = VC.rgbD[2] * bC;

  var rAF = Math.pow((VC.fl * Math.abs(rD)) / 100.0, 0.42);
  var gAF = Math.pow((VC.fl * Math.abs(gD)) / 100.0, 0.42);
  var bAF = Math.pow((VC.fl * Math.abs(bD)) / 100.0, 0.42);

  var rA = (Math.sign(rD) * 400.0 * rAF) / (rAF + 27.13);
  var gA = (Math.sign(gD) * 400.0 * gAF) / (gAF + 27.13);
  var bA = (Math.sign(bD) * 400.0 * bAF) / (bAF + 27.13);

  var a = (11.0 * rA + -12.0 * gA + bA) / 11.0;
  var b = (rA + gA - 2.0 * bA) / 9.0;
  var u = (20.0 * rA + 20.0 * gA + 21.0 * bA) / 20.0;
  var p2 = (40.0 * rA + 20.0 * gA + bA) / 20.0;

  var atanDegrees = (Math.atan2(b, a) * 180.0) / Math.PI;
  var hue = sanitizeDegrees(atanDegrees);
  var hueRadians = (hue * Math.PI) / 180.0;

  var ac = p2 * VC.nbb;
  var J = 100.0 * Math.pow(ac / VC.aw, VC.c * VC.z);

  var huePrime = hue < 20.14 ? hue + 360.0 : hue;
  var eHue = 0.25 * (Math.cos((huePrime * Math.PI) / 180.0 + 2.0) + 3.8);
  var p1 = ((50000.0 / 13.0) * eHue * VC.nc * VC.ncb);
  var t = (p1 * Math.sqrt(a * a + b * b)) / (u + 0.305);
  var alpha = Math.pow(t, 0.9) * Math.pow(1.64 - Math.pow(0.29, VC.n), 0.73);
  var C = alpha * Math.sqrt(J / 100.0);

  return { hue: hue, chroma: C, j: J };
}

function hctFromArgb(argb) {
  var xyz = xyzFromArgb(argb);
  var cam = cam16FromXyz(xyz[0], xyz[1], xyz[2]);
  return { hue: cam.hue, chroma: cam.chroma, tone: lstarFromY(xyz[1]) };
}

// --- inverse: CAM16 (J, C, h) -> XYZ ----------------------------------------

function xyzFromCam16(J, C, h) {
  var hRad = (h * Math.PI) / 180.0;
  var alpha = J === 0.0 ? 0.0 : C / Math.sqrt(J / 100.0);
  var t = Math.pow(alpha / Math.pow(1.64 - Math.pow(0.29, VC.n), 0.73), 1.0 / 0.9);
  var eHue = 0.25 * (Math.cos(hRad + 2.0) + 3.8);
  var ac = VC.aw * Math.pow(J / 100.0, 1.0 / VC.c / VC.z);
  var p1 = eHue * (50000.0 / 13.0) * VC.nc * VC.ncb;
  var p2 = ac / VC.nbb;

  var hSin = Math.sin(hRad), hCos = Math.cos(hRad);
  var gamma = (23.0 * (p2 + 0.305) * t) / (23.0 * p1 + 11.0 * t * hCos + 108.0 * t * hSin);
  var a = gamma * hCos;
  var b = gamma * hSin;

  var rA = (460.0 * p2 + 451.0 * a + 288.0 * b) / 1403.0;
  var gA = (460.0 * p2 - 891.0 * a - 261.0 * b) / 1403.0;
  var bA = (460.0 * p2 - 220.0 * a - 6300.0 * b) / 1403.0;

  function inverseAdapt(component) {
    var base = Math.max(0, (27.13 * Math.abs(component)) / (400.0 - Math.abs(component)));
    return Math.sign(component) * (100.0 / VC.fl) * Math.pow(base, 1.0 / 0.42);
  }

  var rC = inverseAdapt(rA), gC = inverseAdapt(gA), bC = inverseAdapt(bA);
  var rF = rC / VC.rgbD[0], gF = gC / VC.rgbD[1], bF = bC / VC.rgbD[2];

  var x = 1.86206786 * rF - 1.01125463 * gF + 0.14918677 * bF;
  var y = 0.38752654 * rF + 0.62144744 * gF - 0.00897398 * bF;
  var z = -0.01584150 * rF - 0.03412294 * gF + 1.04996444 * bF;
  return [x, y, z];
}

// --- HCT -> ARGB -------------------------------------------------------------
//
// Y (and therefore tone) rises monotonically with J at fixed hue and chroma, so
// the lightness half is solved exactly by bisecting J. Only chroma can be
// unreachable in sRGB, so that half bisects downward for the most saturated
// value the gamut still holds. Together they hit the requested tone exactly and
// give up only the chroma that no sRGB colour could have carried.

function linrgbFromXyz(xyz) {
  return matMul(xyz, XYZ_TO_SRGB);
}

function inGamut(linrgb) {
  for (var i = 0; i < 3; i++) {
    if (linrgb[i] < -0.02 || linrgb[i] > 100.02) return false;
  }
  return true;
}

function solveJForTone(chroma, hue, targetY) {
  var lo = 0.0, hi = 100.0;
  for (var i = 0; i < 48; i++) {
    var mid = (lo + hi) / 2.0;
    var xyz = xyzFromCam16(mid, chroma, hue);
    if (xyz[1] < targetY) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2.0;
}

function argbFromHct(hue, chroma, tone) {
  if (chroma < 1.0 || Math.round(tone) <= 0.0 || Math.round(tone) >= 100.0) {
    return argbFromLstar(tone);
  }
  hue = sanitizeDegrees(hue);
  var targetY = yFromLstar(tone);

  var low = 0.0, high = chroma, best = null;
  for (var i = 0; i < 24 && high - low > 0.01; i++) {
    var mid = (low + high) / 2.0;
    var j = solveJForTone(mid, hue, targetY);
    var linrgb = linrgbFromXyz(xyzFromCam16(j, mid, hue));
    if (inGamut(linrgb)) { best = linrgb; low = mid; } else { high = mid; }
  }
  if (best === null) return argbFromLstar(tone);
  return argbFromRgb(delinearized(best[0]), delinearized(best[1]), delinearized(best[2]));
}

// --- tonal palettes and the tonalSpot scheme ---------------------------------

function TonalPalette(hue, chroma) {
  this.hue = hue;
  this.chroma = chroma;
  this.cache = {};
}
TonalPalette.prototype.tone = function (t) {
  if (this.cache[t] === undefined) this.cache[t] = argbFromHct(this.hue, this.chroma, t);
  return this.cache[t];
};

function hexFromArgb(argb) {
  var r = redFromArgb(argb).toString(16).padStart(2, '0');
  var g = greenFromArgb(argb).toString(16).padStart(2, '0');
  var b = blueFromArgb(argb).toString(16).padStart(2, '0');
  return ('#' + r + g + b).toUpperCase();
}

function argbFromHex(hex) {
  var h = hex.replace('#', '');
  if (h.length === 8) h = h.slice(2); // drop an ARGB alpha prefix
  return argbFromRgb(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
}

// Palette chroma values are the tonalSpot constants, not seed-derived.
function buildScheme(seedHex, isDark) {
  var seedHct = hctFromArgb(argbFromHex(seedHex));
  var hue = seedHct.hue;

  var primary = new TonalPalette(hue, 36.0);
  var secondary = new TonalPalette(hue, 16.0);
  var tertiary = new TonalPalette(sanitizeDegrees(hue + 60.0), 24.0);
  var neutral = new TonalPalette(hue, 6.0);
  var neutralVariant = new TonalPalette(hue, 8.0);
  var error = new TonalPalette(25.0, 84.0);

  function t(palette, lightTone, darkTone) {
    return hexFromArgb(palette.tone(isDark ? darkTone : lightTone));
  }

  return {
    primary: t(primary, 40, 80),
    onPrimary: t(primary, 100, 20),
    primaryContainer: t(primary, 90, 30),
    onPrimaryContainer: t(primary, 10, 90),
    inversePrimary: t(primary, 80, 40),

    secondary: t(secondary, 40, 80),
    onSecondary: t(secondary, 100, 20),
    secondaryContainer: t(secondary, 90, 30),
    onSecondaryContainer: t(secondary, 10, 90),

    tertiary: t(tertiary, 40, 80),
    onTertiary: t(tertiary, 100, 20),
    tertiaryContainer: t(tertiary, 90, 30),
    onTertiaryContainer: t(tertiary, 10, 90),

    error: t(error, 40, 80),
    onError: t(error, 100, 20),
    errorContainer: t(error, 90, 30),
    onErrorContainer: t(error, 10, 90),

    surface: t(neutral, 98, 6),
    onSurface: t(neutral, 10, 90),
    surfaceDim: t(neutral, 87, 6),
    surfaceBright: t(neutral, 98, 24),
    surfaceContainerLowest: t(neutral, 100, 4),
    surfaceContainerLow: t(neutral, 96, 10),
    surfaceContainer: t(neutral, 94, 12),
    surfaceContainerHigh: t(neutral, 92, 17),
    surfaceContainerHighest: t(neutral, 90, 22),
    inverseSurface: t(neutral, 20, 90),
    onInverseSurface: t(neutral, 95, 20),

    surfaceVariant: t(neutralVariant, 90, 30),
    onSurfaceVariant: t(neutralVariant, 30, 80),
    outline: t(neutralVariant, 50, 60),
    outlineVariant: t(neutralVariant, 80, 30),

    shadow: '#000000',
    scrim: '#000000',
    surfaceTint: t(primary, 40, 80),
  };
}
window.M3 = { buildScheme: buildScheme, hexFromArgb: hexFromArgb, argbFromHex: argbFromHex };
})();
