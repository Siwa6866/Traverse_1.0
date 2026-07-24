const state = {
  rows: [],
  result: null
};

const defaultRows = [
  { station: "A", deg: 90, min: 0, sec: 5, distance: 100.000 },
  { station: "B", deg: 90, min: 0, sec: 2, distance: 100.000 },
  { station: "C", deg: 90, min: 0, sec: 4, distance: 100.000 },
  { station: "D", deg: 90, min: 0, sec: 1, distance: 100.000 }
];

const $ = (id) => document.getElementById(id);

function numberValue(id) {
  return Number($(id).value);
}

function normalizeAzimuth(value) {
  return ((value % 360) + 360) % 360;
}

function dmsToDecimal(deg, min, sec) {
  const sign = Number(deg) < 0 ? -1 : 1;
  return sign * (Math.abs(Number(deg)) + Number(min) / 60 + Number(sec) / 3600);
}

function decimalToDms(value, signed = false) {
  if (!Number.isFinite(value)) return "-";

  let sign = "";
  let working = value;

  if (signed) {
    sign = working < 0 ? "-" : "+";
    working = Math.abs(working);
  } else {
    working = normalizeAzimuth(working);
  }

  let degree = Math.floor(working);
  let minuteDecimal = (working - degree) * 60;
  let minute = Math.floor(minuteDecimal);
  let second = Number(((minuteDecimal - minute) * 60).toFixed(2));

  if (second >= 60) {
    second = 0;
    minute += 1;
  }

  if (minute >= 60) {
    minute = 0;
    degree += 1;
  }

  if (!signed) degree = degree % 360;

  return `${sign}${String(degree).padStart(signed ? 1 : 3, "0")}° ${String(minute).padStart(2, "0")}′ ${second.toFixed(2).padStart(5, "0")}″`;
}

function format3(value) {
  return Number(value).toFixed(3);
}

function formatComma3(value) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
}

function coordinateAzimuth(fromE, fromN, toE, toN) {
  const dE = toE - fromE;
  const dN = toN - fromN;

  if (Math.abs(dE) < 1e-12 && Math.abs(dN) < 1e-12) {
    throw new Error("พิกัดจุด A และจุด O ต้องไม่เป็นจุดเดียวกัน");
  }

  return normalizeAzimuth(Math.atan2(dE, dN) * 180 / Math.PI);
}

function validateDms(deg, min, sec, name) {
  if (![deg, min, sec].every(Number.isFinite)) {
    throw new Error(`${name} ต้องเป็นตัวเลข`);
  }

  if (deg < 0 || deg >= 360) {
    throw new Error(`องศาของ${name}ต้องอยู่ระหว่าง 0 ถึงน้อยกว่า 360`);
  }

  if (min < 0 || min >= 60) {
    throw new Error(`ลิปดาของ${name}ต้องอยู่ระหว่าง 0 ถึงน้อยกว่า 60`);
  }

  if (sec < 0 || sec >= 60) {
    throw new Error(`ฟิลิปดาของ${name}ต้องอยู่ระหว่าง 0 ถึงน้อยกว่า 60`);
  }
}

function readOrientation() {
  const aE = numberValue("aE");
  const aN = numberValue("aN");
  const oE = numberValue("oE");
  const oN = numberValue("oN");

  const tieDeg = numberValue("tieDeg");
  const tieMin = numberValue("tieMin");
  const tieSec = numberValue("tieSec");

  validateDms(tieDeg, tieMin, tieSec, "มุมผูก");

  const azAO = coordinateAzimuth(aE, aN, oE, oN);
  const tieAngle = dmsToDecimal(tieDeg, tieMin, tieSec);

  const azAB = $("tieDirection").value === "right"
    ? normalizeAzimuth(azAO + tieAngle)
    : normalizeAzimuth(azAO - tieAngle);

  return {
    aE, aN, oE, oN,
    azAO,
    tieAngle,
    azAB
  };
}

function updateOrientationPreview() {
  try {
    const orientation = readOrientation();
    $("orientationPreview").innerHTML = `
      <strong>Azimuth แนว A→O:</strong> ${decimalToDms(orientation.azAO)}<br>
      <strong>มุมผูก AO→AB:</strong> ${decimalToDms(orientation.tieAngle)}<br>
      <strong>Azimuth เริ่มต้น A→B:</strong> ${decimalToDms(orientation.azAB)}
    `;
  } catch (error) {
    $("orientationPreview").textContent = error.message;
  }
}

function generateStationName() {
  const used = new Set(state.rows.map((row) => row.station));

  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (!used.has(letter)) return letter;
  }

  let number = 1;
  while (used.has(`P${number}`)) number += 1;
  return `P${number}`;
}

function renderInputTable() {
  const tbody = $("inputTable").querySelector("tbody");
  tbody.innerHTML = "";

  state.rows.forEach((row, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><input data-index="${index}" data-field="station" type="text" value="${row.station}"></td>
      <td><input data-index="${index}" data-field="deg" type="number" min="0" max="359" step="1" value="${row.deg}"></td>
      <td><input data-index="${index}" data-field="min" type="number" min="0" max="59" step="1" value="${row.min}"></td>
      <td><input data-index="${index}" data-field="sec" type="number" min="0" max="59.999" step="0.01" value="${row.sec}"></td>
      <td><input data-index="${index}" data-field="distance" type="number" min="0.001" step="0.001" value="${Number(row.distance).toFixed(3)}"></td>
    `;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.index);
      const field = event.target.dataset.field;
      state.rows[index][field] = field === "station"
        ? event.target.value
        : Number(event.target.value);
    });
  });
}

function validateRows(rows) {
  if (rows.length < 3) {
    throw new Error("วงรอบปิดต้องมีอย่างน้อย 3 หมุด");
  }

  const stationNames = rows.map((row) => String(row.station).trim());

  if (stationNames.some((name) => !name)) {
    throw new Error("กรุณากรอกชื่อหมุดให้ครบทุกแถว");
  }

  if (new Set(stationNames).size !== stationNames.length) {
    throw new Error("ชื่อหมุดวงรอบต้องไม่ซ้ำกัน");
  }

  if (stationNames[0].toUpperCase() !== "A") {
    throw new Error("หมุดแถวแรกต้องเป็นจุด A");
  }

  rows.forEach((row, index) => {
    validateDms(Number(row.deg), Number(row.min), Number(row.sec), `มุมภายในแถว ${index + 1}`);

    if (!Number.isFinite(Number(row.distance)) || Number(row.distance) <= 0) {
      throw new Error(`ระยะทางแถว ${index + 1} ต้องมากกว่า 0 เมตร`);
    }
  });
}

function calculateTraverse() {
  validateRows(state.rows);

  const orientation = readOrientation();
  const method = $("adjustmentMethod").value;
  const traverseDirection = $("traverseDirection").value;
  const angularTolerance = numberValue("angularTolerance");
  const closureStandard = numberValue("closureStandard");

  if (!Number.isFinite(angularTolerance) || angularTolerance <= 0) {
    throw new Error("ค่าความคลาดเคลื่อนพื้นฐาน C ต้องมากกว่า 0");
  }

  if (!Number.isFinite(closureStandard) || closureStandard <= 0) {
    throw new Error("เกณฑ์ Error of Closure 1 : x ต้องมากกว่า 0");
  }

  const n = state.rows.length;
  const observedAngles = state.rows.map((row) =>
    dmsToDecimal(row.deg, row.min, row.sec)
  );

  const observedAngleSum = observedAngles.reduce((sum, value) => sum + value, 0);
  const theoreticalAngleSum = (n - 2) * 180;
  const angularMisclosure = observedAngleSum - theoreticalAngleSum;
  const angularMisclosureSec = angularMisclosure * 3600;
  const absoluteAngularMisclosureSec = Math.abs(angularMisclosureSec);
  const allowableAngularMisclosureSec = angularTolerance * Math.sqrt(n);
  const angularStatus = absoluteAngularMisclosureSec <= allowableAngularMisclosureSec
    ? "OK"
    : "NOT OK";

  const angleCorrection = -angularMisclosure / n;
  const adjustedAngles = observedAngles.map((angle) => angle + angleCorrection);

  const azimuths = new Array(n);
  azimuths[0] = orientation.azAB;

  for (let i = 1; i < n; i += 1) {
    azimuths[i] = traverseDirection === "clockwise"
      ? normalizeAzimuth(azimuths[i - 1] + 180 - adjustedAngles[i])
      : normalizeAzimuth(azimuths[i - 1] - 180 + adjustedAngles[i]);
  }

  const calculatedClosingAzimuth = traverseDirection === "clockwise"
    ? normalizeAzimuth(azimuths[n - 1] + 180 - adjustedAngles[0])
    : normalizeAzimuth(azimuths[n - 1] - 180 + adjustedAngles[0]);

  let azimuthClosureDifference = calculatedClosingAzimuth - azimuths[0];
  azimuthClosureDifference = ((azimuthClosureDifference + 180) % 360 + 360) % 360 - 180;

  const distances = state.rows.map((row) => Number(row.distance));
  const latitudeN = azimuths.map((az, i) =>
    distances[i] * Math.cos(az * Math.PI / 180)
  );
  const departureE = azimuths.map((az, i) =>
    distances[i] * Math.sin(az * Math.PI / 180)
  );

  const perimeter = distances.reduce((sum, value) => sum + value, 0);
  const misclosureN = latitudeN.reduce((sum, value) => sum + value, 0);
  const misclosureE = departureE.reduce((sum, value) => sum + value, 0);
  const linearMisclosure = Math.hypot(misclosureE, misclosureN);

  const relativePrecision = linearMisclosure < 1e-12
    ? Infinity
    : perimeter / linearMisclosure;

  const relativePrecisionDenominator = Number.isFinite(relativePrecision)
    ? Math.round(relativePrecision)
    : Infinity;

  const closurePrecisionStatus = !Number.isFinite(relativePrecision)
    || relativePrecision >= closureStandard
    ? "OK"
    : "NOT OK";

  const misclosureAzimuth = linearMisclosure < 1e-12
    ? NaN
    : normalizeAzimuth(Math.atan2(misclosureE, misclosureN) * 180 / Math.PI);

  let closureBearing = "ไม่มีค่าคลาดปิด";

  if (linearMisclosure >= 1e-12) {
    const ns = misclosureN >= 0 ? "N" : "S";
    const ew = misclosureE >= 0 ? "E" : "W";
    const bearingAngle = Math.atan2(
      Math.abs(misclosureE),
      Math.abs(misclosureN)
    ) * 180 / Math.PI;

    closureBearing = `${ns} ${decimalToDms(bearingAngle)} ${ew}`;
  }

  let correctionN;
  let correctionE;

  if (method === "compass") {
    correctionN = distances.map((distance) =>
      -misclosureN * distance / perimeter
    );

    correctionE = distances.map((distance) =>
      -misclosureE * distance / perimeter
    );
  } else {
    const sumAbsLat = latitudeN.reduce((sum, value) => sum + Math.abs(value), 0);
    const sumAbsDep = departureE.reduce((sum, value) => sum + Math.abs(value), 0);

    correctionN = latitudeN.map((value) =>
      sumAbsLat < 1e-12
        ? -misclosureN / n
        : -misclosureN * Math.abs(value) / sumAbsLat
    );

    correctionE = departureE.map((value) =>
      sumAbsDep < 1e-12
        ? -misclosureE / n
        : -misclosureE * Math.abs(value) / sumAbsDep
    );
  }

  const adjustedLatitudeN = latitudeN.map((value, i) => value + correctionN[i]);
  const adjustedDepartureE = departureE.map((value, i) => value + correctionE[i]);

  const unadjustedE = [orientation.aE];
  const unadjustedN = [orientation.aN];
  const adjustedE = [orientation.aE];
  const adjustedN = [orientation.aN];

  for (let i = 0; i < n; i += 1) {
    unadjustedE.push(unadjustedE[i] + departureE[i]);
    unadjustedN.push(unadjustedN[i] + latitudeN[i]);
    adjustedE.push(adjustedE[i] + adjustedDepartureE[i]);
    adjustedN.push(adjustedN[i] + adjustedLatitudeN[i]);
  }

  const polygonE = adjustedE.slice(0, n);
  const polygonN = adjustedN.slice(0, n);

  let signedArea = 0;

  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    signedArea += polygonE[i] * polygonN[j] - polygonE[j] * polygonN[i];
  }

  signedArea *= 0.5;

  const areaM2 = Math.abs(signedArea);
  const areaHectare = areaM2 / 10000;
  const areaRai = areaM2 / 1600;
  const raiWhole = Math.floor(areaM2 / 1600);
  const remainderAfterRai = areaM2 - raiWhole * 1600;
  const nganWhole = Math.floor(remainderAfterRai / 400);
  const squareWah = (remainderAfterRai - nganWhole * 400) / 4;
  const areaThai = `${raiWhole} ไร่ ${nganWhole} งาน ${squareWah.toFixed(3)} ตารางวา`;

  const detailRows = state.rows.map((row, i) => ({
    From: row.station,
    To: i === n - 1 ? state.rows[0].station : state.rows[i + 1].station,
    Angle_Observed: decimalToDms(observedAngles[i]),
    Angle_Correction: decimalToDms(angleCorrection, true),
    Angle_Adjusted: decimalToDms(adjustedAngles[i]),
    Azimuth: decimalToDms(azimuths[i]),
    Distance_m: distances[i],
    Latitude_N_m: latitudeN[i],
    Departure_E_m: departureE[i],
    Correction_N_m: correctionN[i],
    Correction_E_m: correctionE[i],
    Adjusted_Latitude_N_m: adjustedLatitudeN[i],
    Adjusted_Departure_E_m: adjustedDepartureE[i],
    Adjusted_Easting_m: adjustedE[i + 1],
    Adjusted_Northing_m: adjustedN[i + 1]
  }));

  const coordinateRows = state.rows.map((row, i) => ({
    Station: row.station,
    Easting_Unadjusted_m: unadjustedE[i],
    Northing_Unadjusted_m: unadjustedN[i],
    Easting_Adjusted_m: adjustedE[i],
    Northing_Adjusted_m: adjustedN[i]
  }));

  return {
    method,
    traverseDirection,
    angularTolerance,
    closureStandard,
    ...orientation,
    n,
    observedAngles,
    observedAngleSum,
    theoreticalAngleSum,
    angularMisclosure,
    absoluteAngularMisclosureSec,
    allowableAngularMisclosureSec,
    angularStatus,
    angleCorrection,
    adjustedAngles,
    azimuths,
    calculatedClosingAzimuth,
    azimuthClosureDifference,
    perimeter,
    latitudeN,
    departureE,
    misclosureN,
    misclosureE,
    linearMisclosure,
    relativePrecision,
    relativePrecisionDenominator,
    closurePrecisionStatus,
    misclosureAzimuth,
    closureBearing,
    correctionN,
    correctionE,
    adjustedLatitudeN,
    adjustedDepartureE,
    unadjustedE,
    unadjustedN,
    adjustedE,
    adjustedN,
    areaM2,
    areaHectare,
    areaRai,
    areaThai,
    detailRows,
    coordinateRows
  };
}

function showError(message) {
  $("errorBox").textContent = message;
  $("errorBox").classList.remove("hidden");
}

function clearError() {
  $("errorBox").textContent = "";
  $("errorBox").classList.add("hidden");
}

function statusHtml(status) {
  const className = status === "OK" ? "status-ok" : "status-not-ok";
  return `<span class="${className}">${status}</span>`;
}

function renderSummary(result) {
  const relativePrecisionText = Number.isFinite(result.relativePrecision)
    ? `1 : ${result.relativePrecisionDenominator.toLocaleString("en-US")}`
    : "วงรอบปิดสมบูรณ์";

  const misclosureAzimuthText = Number.isFinite(result.misclosureAzimuth)
    ? decimalToDms(result.misclosureAzimuth)
    : "ไม่มีค่าคลาดปิด";

  $("summaryCards").innerHTML = `
    <div class="summary-box">
      <strong>ข้อมูลแนวอ้างอิง</strong><br>
      จุด A: E = ${formatComma3(result.aE)} m, N = ${formatComma3(result.aN)} m<br>
      จุด O: E = ${formatComma3(result.oE)} m, N = ${formatComma3(result.oN)} m<br>
      Azimuth A→O = ${decimalToDms(result.azAO)}<br>
      มุมผูก AO→AB = ${decimalToDms(result.tieAngle)}<br>
      <strong>Azimuth เริ่มต้น A→B = ${decimalToDms(result.azAB)}</strong>
    </div>

    <div class="summary-box">
      <strong>การตรวจสอบค่าคลาดปิดมุมภายใน</strong><br>
      จำนวนมุม N = ${result.n}<br>
      ผลรวมมุมที่วัดได้ = ${decimalToDms(result.observedAngleSum, true)}<br>
      ผลรวมมุมทฤษฎี = ${decimalToDms(result.theoreticalAngleSum, true)}<br>
      ค่าคลาดปิดมุม = ${decimalToDms(result.angularMisclosure, true)}<br>
      |fβ| = ${result.absoluteAngularMisclosureSec.toFixed(2)}″<br>
      ค่าคลาดปิดที่ยอมให้ = ${result.allowableAngularMisclosureSec.toFixed(2)}″<br>
      ผลการตรวจสอบ = ${statusHtml(result.angularStatus)}
    </div>

    <div class="summary-box">
      <strong>Error of Closure</strong><br>
      ระยะทางรวม = ${formatComma3(result.perimeter)} m<br>
      Easting Error = ${format3(result.misclosureE)} m<br>
      Northing Error = ${format3(result.misclosureN)} m<br>
      Linear Error of Closure = ${format3(result.linearMisclosure)} m<br>
      Azimuth of Closure Error = ${misclosureAzimuthText}<br>
      Bearing of Closure Error = ${result.closureBearing}<br>
      Relative Precision = <strong>${relativePrecisionText}</strong><br>
      เกณฑ์ที่กำหนด = 1 : ${Math.round(result.closureStandard).toLocaleString("en-US")}<br>
      ผลตรวจสอบ = ${statusHtml(result.closurePrecisionStatus)}
    </div>

    <div class="summary-box">
      <strong>พื้นที่ภายในวงรอบหลังปรับแก้</strong><br>
      พื้นที่ = ${formatComma3(result.areaM2)} m²<br>
      พื้นที่ = ${formatComma3(result.areaHectare)} เฮกตาร์<br>
      พื้นที่ = ${formatComma3(result.areaRai)} ไร่<br>
      หน่วยไทย = ${result.areaThai}
    </div>
  `;
}

function renderTable(tableId, rows, numericColumns) {
  const table = $(tableId);
  const columns = Object.keys(rows[0] || {});

  table.innerHTML = `
    <thead>
      <tr>${columns.map((column) => `<th>${column}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows.map((row) => `
        <tr>
          ${columns.map((column) => {
            const value = row[column];
            const isNumeric = numericColumns.includes(column);
            return `<td class="${isNumeric ? "numeric" : ""}">${isNumeric ? format3(value) : value}</td>`;
          }).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;
}

function drawTraverse(result) {
  const canvas = $("traverseCanvas");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const allE = [
    ...result.unadjustedE,
    ...result.adjustedE,
    result.oE
  ];

  const allN = [
    ...result.unadjustedN,
    ...result.adjustedN,
    result.oN
  ];

  const minE = Math.min(...allE);
  const maxE = Math.max(...allE);
  const minN = Math.min(...allN);
  const maxN = Math.max(...allN);

  const widthSpan = Math.max(maxE - minE, 1);
  const heightSpan = Math.max(maxN - minN, 1);

  const margin = 110;
  const scale = Math.min(
    (canvas.width - margin * 2) / widthSpan,
    (canvas.height - margin * 2) / heightSpan
  );

  const x = (e) => margin + (e - minE) * scale;
  const y = (n) => canvas.height - margin - (n - minN) * scale;

  // --------------------------------------------------------
  // Grid and coordinate axes
  // --------------------------------------------------------

  const plotLeft = margin;
  const plotRight = canvas.width - margin;
  const plotTop = margin;
  const plotBottom = canvas.height - margin;
  const tickCount = 10;

  ctx.strokeStyle = "#d7e0e7";
  ctx.lineWidth = 1;

  ctx.font = "12px Arial";
  ctx.fillStyle = "#415466";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= tickCount; i += 1) {
    const ratio = i / tickCount;

    const gx = plotLeft + (plotRight - plotLeft) * ratio;
    const gy = plotTop + (plotBottom - plotTop) * ratio;

    // Vertical grid line
    ctx.beginPath();
    ctx.moveTo(gx, plotTop);
    ctx.lineTo(gx, plotBottom);
    ctx.stroke();

    // Horizontal grid line
    ctx.beginPath();
    ctx.moveTo(plotLeft, gy);
    ctx.lineTo(plotRight, gy);
    ctx.stroke();

    // Easting coordinate label
    const eastingValue = minE + widthSpan * ratio;

    ctx.save();
    ctx.translate(gx, plotBottom + 24);
    ctx.rotate(-Math.PI / 4);
    ctx.textAlign = "right";
    ctx.fillText(
      eastingValue.toFixed(3),
      0,
      0
    );
    ctx.restore();

    // Northing coordinate label
    const northingValue = maxN - heightSpan * ratio;

    ctx.textAlign = "right";
    ctx.fillText(
      northingValue.toFixed(3),
      plotLeft - 12,
      gy
    );
  }

  // Plot border
  ctx.strokeStyle = "#8293a1";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    plotLeft,
    plotTop,
    plotRight - plotLeft,
    plotBottom - plotTop
  );

  // Axis titles
  ctx.fillStyle = "#123b5d";
  ctx.font = "bold 15px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillText(
    "Easting, E (m)",
    (plotLeft + plotRight) / 2,
    canvas.height - 14
  );

  ctx.save();
  ctx.translate(20, (plotTop + plotBottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(
    "Northing, N (m)",
    0,
    0
  );
  ctx.restore();

  ctx.textAlign = "start";
  ctx.textBaseline = "middle";

  // --------------------------------------------------------
  // Reference line A-O
  // --------------------------------------------------------

  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x(result.aE), y(result.aN));
  ctx.lineTo(x(result.oE), y(result.oN));
  ctx.stroke();

  // --------------------------------------------------------
  // Traverse lines
  // --------------------------------------------------------

  function drawLine(eValues, nValues, color, dashed, pointFilled) {
    ctx.setLineDash(dashed ? [12, 8] : []);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;

    ctx.beginPath();

    eValues.forEach((value, index) => {
      const px = x(value);
      const py = y(nValues[index]);

      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });

    ctx.stroke();

    eValues.forEach((value, index) => {
      ctx.beginPath();
      ctx.arc(
        x(value),
        y(nValues[index]),
        5,
        0,
        Math.PI * 2
      );

      if (pointFilled) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
    });
  }

  drawLine(
    result.unadjustedE,
    result.unadjustedN,
    "#888",
    true,
    false
  );

  drawLine(
    result.adjustedE,
    result.adjustedN,
    "#176b87",
    false,
    true
  );

  // --------------------------------------------------------
  // Station labels and adjusted coordinates
  // --------------------------------------------------------

  const stationLabels = state.rows.map((row) => row.station);

  ctx.textBaseline = "middle";

  stationLabels.forEach((station, index) => {
    const px = x(result.adjustedE[index]);
    const py = y(result.adjustedN[index]);

    const coordinateText =
      `E=${format3(result.adjustedE[index])}, ` +
      `N=${format3(result.adjustedN[index])}`;

    const offsetX = index % 2 === 0 ? 10 : 10;
    const offsetY = index % 2 === 0 ? -24 : 24;

    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "#0f3d4c";
    ctx.fillText(
      station,
      px + offsetX,
      py + offsetY
    );

    ctx.font = "12px Arial";
    ctx.fillStyle = "#243447";
    ctx.fillText(
      coordinateText,
      px + offsetX,
      py + offsetY + 16
    );
  });

  // --------------------------------------------------------
  // Distance labels on adjusted traverse sides
  // --------------------------------------------------------

  ctx.font = "bold 13px Arial";
  ctx.fillStyle = "#7a3e00";

  result.detailRows.forEach((row, index) => {
    const nextIndex = (index + 1) % result.n;

    const x1 = x(result.adjustedE[index]);
    const y1 = y(result.adjustedN[index]);
    const x2 = x(result.adjustedE[nextIndex]);
    const y2 = y(result.adjustedN[nextIndex]);

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;

    const normalX = -dy / length;
    const normalY = dx / length;

    const labelX = midX + normalX * 18;
    const labelY = midY + normalY * 18;

    const distanceText = `${Number(row.Distance_m).toFixed(3)} m`;

    const textWidth = ctx.measureText(distanceText).width;

    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillRect(
      labelX - textWidth / 2 - 4,
      labelY - 9,
      textWidth + 8,
      18
    );

    ctx.fillStyle = "#7a3e00";
    ctx.textAlign = "center";
    ctx.fillText(
      distanceText,
      labelX,
      labelY
    );
  });

  ctx.textAlign = "start";

  // --------------------------------------------------------
  // Point O and its coordinates
  // --------------------------------------------------------

  ctx.fillStyle = "#a12f2f";
  ctx.beginPath();
  ctx.arc(
    x(result.oE),
    y(result.oN),
    7,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.font = "bold 16px Arial";
  ctx.fillText(
    "O",
    x(result.oE) + 10,
    y(result.oN) - 16
  );

  ctx.font = "12px Arial";
  ctx.fillStyle = "#243447";
  ctx.fillText(
    `E=${format3(result.oE)}, N=${format3(result.oN)}`,
    x(result.oE) + 10,
    y(result.oN) + 2
  );

  // --------------------------------------------------------
  // Tie angle AO -> AB
  // --------------------------------------------------------

  const aX = x(result.aE);
  const aY = y(result.aN);

  const vectorAO = {
    x: x(result.oE) - aX,
    y: y(result.oN) - aY
  };

  const vectorAB = {
    x: x(result.adjustedE[1]) - aX,
    y: y(result.adjustedN[1]) - aY
  };

  const angleCanvasAO = Math.atan2(
    vectorAO.y,
    vectorAO.x
  );

  const angleCanvasAB = Math.atan2(
    vectorAB.y,
    vectorAB.x
  );

  let startAngle = angleCanvasAO;
  let endAngle = angleCanvasAB;
  let anticlockwise = false;

  if ($("tieDirection").value === "right") {
    while (endAngle < startAngle) {
      endAngle += Math.PI * 2;
    }
    anticlockwise = false;
  } else {
    while (endAngle > startAngle) {
      endAngle -= Math.PI * 2;
    }
    anticlockwise = true;
  }

  const arcRadius = 52;

  ctx.strokeStyle = "#7a1f7a";
  ctx.lineWidth = 3;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(
    aX,
    aY,
    arcRadius,
    startAngle,
    endAngle,
    anticlockwise
  );
  ctx.stroke();

  const midAngle = anticlockwise
    ? startAngle - Math.abs(startAngle - endAngle) / 2
    : startAngle + Math.abs(endAngle - startAngle) / 2;

  const tieLabelX = aX + Math.cos(midAngle) * (arcRadius + 28);
  const tieLabelY = aY + Math.sin(midAngle) * (arcRadius + 28);

  const tieText =
    `มุมผูก AO→AB = ${decimalToDms(result.tieAngle)}`;

  ctx.font = "bold 13px Arial";
  const tieTextWidth = ctx.measureText(tieText).width;

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillRect(
    tieLabelX - tieTextWidth / 2 - 5,
    tieLabelY - 10,
    tieTextWidth + 10,
    20
  );

  ctx.fillStyle = "#7a1f7a";
  ctx.textAlign = "center";
  ctx.fillText(
    tieText,
    tieLabelX,
    tieLabelY
  );

  ctx.textAlign = "start";

  // --------------------------------------------------------
  // Azimuth labels for AO and AB
  // --------------------------------------------------------

  const midAOX = (
    x(result.aE) +
    x(result.oE)
  ) / 2;

  const midAOY = (
    y(result.aN) +
    y(result.oN)
  ) / 2;

  ctx.font = "12px Arial";
  ctx.fillStyle = "#555";
  ctx.fillText(
    `Az AO = ${decimalToDms(result.azAO)}`,
    midAOX + 8,
    midAOY - 10
  );

  const midABX = (
    x(result.adjustedE[0]) +
    x(result.adjustedE[1])
  ) / 2;

  const midABY = (
    y(result.adjustedN[0]) +
    y(result.adjustedN[1])
  ) / 2;

  ctx.fillStyle = "#176b87";
  ctx.fillText(
    `Az AB = ${decimalToDms(result.azAB)}`,
    midABX + 8,
    midABY - 10
  );

  // --------------------------------------------------------
  // North arrow
  // --------------------------------------------------------

  ctx.fillStyle = "#111";
  ctx.font = "bold 20px Arial";
  ctx.fillText("N", 45, 50);

  ctx.beginPath();
  ctx.moveTo(52, 115);
  ctx.lineTo(52, 62);
  ctx.strokeStyle = "#111";
  ctx.setLineDash([]);
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(52, 62);
  ctx.lineTo(44, 76);
  ctx.lineTo(60, 76);
  ctx.closePath();
  ctx.fill();

  // --------------------------------------------------------
  // Figure note inside canvas
  // --------------------------------------------------------

  ctx.font = "12px Arial";
  ctx.fillStyle = "#536471";
  ctx.textAlign = "center";

  ctx.fillText(
    "พิกัดที่แสดงเป็นพิกัดหลังปรับแก้ และระยะเป็นระยะของแต่ละด้านวงรอบ",
    canvas.width / 2,
    canvas.height - 44
  );

  ctx.textAlign = "start";
}
function renderResults(result) {
  renderSummary(result);

  renderTable(
    "resultTable",
    result.detailRows,
    [
      "Distance_m",
      "Latitude_N_m",
      "Departure_E_m",
      "Correction_N_m",
      "Correction_E_m",
      "Adjusted_Latitude_N_m",
      "Adjusted_Departure_E_m",
      "Adjusted_Easting_m",
      "Adjusted_Northing_m"
    ]
  );

  renderTable(
    "coordinateTable",
    result.coordinateRows,
    [
      "Easting_Unadjusted_m",
      "Northing_Unadjusted_m",
      "Easting_Adjusted_m",
      "Northing_Adjusted_m"
    ]
  );

  drawTraverse(result);
  $("resultsSection").classList.remove("hidden");
}

function rowsToCsv(rows) {
  const columns = Object.keys(rows[0] || {});

  const escape = (value) => {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };

  return [
    columns.map(escape).join(","),
    ...rows.map((row) => columns.map((column) => {
      const value = typeof row[column] === "number"
        ? row[column].toFixed(3)
        : row[column];
      return escape(value);
    }).join(","))
  ].join("\n");
}

function downloadText(filename, content, mimeType) {
  const blob = new Blob(["\ufeff", content], {
    type: mimeType
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadExcel(result) {
  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    ["รายการ", "ผลลัพธ์"],
    ["วิธีปรับแก้", result.method === "compass" ? "Compass Rule" : "Transit Rule"],
    ["Azimuth A-O", decimalToDms(result.azAO)],
    ["Azimuth A-B", decimalToDms(result.azAB)],
    ["ค่าคลาดปิดมุม", decimalToDms(result.angularMisclosure, true)],
    ["ผลตรวจสอบมุม", result.angularStatus],
    ["ระยะทางรวม (m)", format3(result.perimeter)],
    ["Easting Error (m)", format3(result.misclosureE)],
    ["Northing Error (m)", format3(result.misclosureN)],
    ["Linear Error of Closure (m)", format3(result.linearMisclosure)],
    ["Relative Precision", Number.isFinite(result.relativePrecision) ? `1 : ${result.relativePrecisionDenominator}` : "Perfect closure"],
    ["เกณฑ์ Error of Closure", `1 : ${Math.round(result.closureStandard)}`],
    ["ผลตรวจสอบ Error of Closure", result.closurePrecisionStatus],
    ["พื้นที่ (m²)", format3(result.areaM2)],
    ["พื้นที่ (ha)", format3(result.areaHectare)],
    ["พื้นที่ (rai)", format3(result.areaRai)],
    ["พื้นที่หน่วยไทย", result.areaThai]
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(summaryRows),
    "Summary"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(result.detailRows),
    "Traverse Calculation"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(result.coordinateRows),
    "Coordinates"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(state.rows),
    "Input Data"
  );

  XLSX.writeFile(
    workbook,
    `Traverse_All_Results_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

function downloadPdf(result) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text("Closed Traverse Adjustment Report", 148, 15, {
    align: "center"
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  const summary = [
    ["Method", result.method === "compass" ? "Compass Rule" : "Transit Rule"],
    ["Azimuth A-O", decimalToDms(result.azAO)],
    ["Azimuth A-B", decimalToDms(result.azAB)],
    ["Angular status", result.angularStatus],
    ["Perimeter (m)", format3(result.perimeter)],
    ["Easting error (m)", format3(result.misclosureE)],
    ["Northing error (m)", format3(result.misclosureN)],
    ["Linear closure error (m)", format3(result.linearMisclosure)],
    ["Relative precision", Number.isFinite(result.relativePrecision) ? `1 : ${result.relativePrecisionDenominator}` : "Perfect closure"],
    ["Required precision", `1 : ${Math.round(result.closureStandard)}`],
    ["Closure status", result.closurePrecisionStatus],
    ["Adjusted area (m2)", format3(result.areaM2)]
  ];

  pdf.autoTable({
    startY: 23,
    head: [["Item", "Result"]],
    body: summary,
    styles: {
      fontSize: 8
    },
    headStyles: {
      fillColor: [23, 107, 135]
    }
  });

  const canvas = $("traverseCanvas");
  const image = canvas.toDataURL("image/png");
  pdf.addPage();
  pdf.setFontSize(15);
  pdf.text("Traverse Plot", 148, 15, {
    align: "center"
  });
  pdf.addImage(image, "PNG", 20, 22, 257, 165);

  pdf.addPage();
  pdf.setFontSize(15);
  pdf.text("Traverse Calculation", 148, 15, {
    align: "center"
  });

  const detailColumns = Object.keys(result.detailRows[0]);

  pdf.autoTable({
    startY: 22,
    head: [detailColumns],
    body: result.detailRows.map((row) =>
      detailColumns.map((column) =>
        typeof row[column] === "number"
          ? row[column].toFixed(3)
          : row[column]
      )
    ),
    styles: {
      fontSize: 4.5,
      cellPadding: 1
    },
    headStyles: {
      fillColor: [23, 107, 135]
    }
  });

  pdf.addPage();
  pdf.setFontSize(15);
  pdf.text("Adjusted Coordinates", 148, 15, {
    align: "center"
  });

  const coordinateColumns = Object.keys(result.coordinateRows[0]);

  pdf.autoTable({
    startY: 22,
    head: [coordinateColumns],
    body: result.coordinateRows.map((row) =>
      coordinateColumns.map((column) =>
        typeof row[column] === "number"
          ? row[column].toFixed(3)
          : row[column]
      )
    ),
    styles: {
      fontSize: 7
    },
    headStyles: {
      fillColor: [23, 107, 135]
    }
  });

  pdf.save(
    `Traverse_Detailed_Report_${new Date().toISOString().slice(0, 10)}.pdf`
  );
}

function resetApp() {
  state.rows = defaultRows.map((row) => ({ ...row }));
  renderInputTable();

  $("adjustmentMethod").value = "compass";
  $("traverseDirection").value = "clockwise";
  $("angularTolerance").value = 30;
  $("closureStandard").value = 5000;
  $("aE").value = "500000.000";
  $("aN").value = "1800000.000";
  $("oE").value = "500000.000";
  $("oN").value = "1800100.000";
  $("tieDirection").value = "right";
  $("tieDeg").value = 90;
  $("tieMin").value = 0;
  $("tieSec").value = 0;

  state.result = null;
  $("resultsSection").classList.add("hidden");
  clearError();
  updateOrientationPreview();
}

$("addStationButton").addEventListener("click", () => {
  state.rows.push({
    station: generateStationName(),
    deg: 90,
    min: 0,
    sec: 0,
    distance: 100.000
  });

  renderInputTable();
});

$("removeStationButton").addEventListener("click", () => {
  if (state.rows.length <= 3) {
    showError("วงรอบปิดต้องมีอย่างน้อย 3 หมุด");
    return;
  }

  state.rows.pop();
  renderInputTable();
  clearError();
});

$("resetButton").addEventListener("click", resetApp);

$("calculateButton").addEventListener("click", () => {
  try {
    clearError();
    state.result = calculateTraverse();
    renderResults(state.result);
    $("resultsSection").scrollIntoView({
      behavior: "smooth"
    });
  } catch (error) {
    showError(error.message);
  }
});

[
  "aE", "aN", "oE", "oN",
  "tieDeg", "tieMin", "tieSec",
  "tieDirection"
].forEach((id) => {
  $(id).addEventListener("input", updateOrientationPreview);
  $(id).addEventListener("change", updateOrientationPreview);
});

$("downloadDetailCsv").addEventListener("click", () => {
  if (!state.result) return;

  downloadText(
    "Traverse_Adjustment_Result.csv",
    rowsToCsv(state.result.detailRows),
    "text/csv;charset=utf-8"
  );
});

$("downloadCoordinatesCsv").addEventListener("click", () => {
  if (!state.result) return;

  downloadText(
    "Traverse_Coordinates.csv",
    rowsToCsv(state.result.coordinateRows),
    "text/csv;charset=utf-8"
  );
});

$("downloadExcel").addEventListener("click", () => {
  if (state.result) downloadExcel(state.result);
});

$("downloadPdf").addEventListener("click", () => {
  if (state.result) downloadPdf(state.result);
});

$("printReport").addEventListener("click", () => {
  window.print();
});

resetApp();
