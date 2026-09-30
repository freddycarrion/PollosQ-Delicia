const fs = require('fs');

let content = fs.readFileSync('app/admin/caja/page.tsx', 'utf8');

// Replace Headers
content = content.replace(
  /<th>Apertura<\/th>\s*<th className="text-right">Monto Inicial<\/th>\s*<th className="text-right">Efectivo Total<\/th>\s*<th className="text-right">Cierre Físico<\/th>\s*<th className="text-right">Diferencia<\/th>/g,
  `<th>Apertura / Cierre</th>
              <th className="text-right">Monto Inicial</th>
              <th className="text-right">Ventas Efectivo</th>
              <th className="text-right">Monto Cierre</th>`
);

// Replace Row Logic
content = content.replace(
  /const cajaEsperada = base \+ ventasEfectivo\s*const cajaFisica = turno\.monto_cierre \|\| 0\s*const diferencia = cajaFisica - cajaEsperada\s*const isAbierto = turno\.estado === 'abierto'\s*const difColor = isAbierto \? 'var\(--text-400\)' : diferencia < 0 \? 'var\(--red\)' : diferencia > 0 \? 'var\(--yellow\)' : '#4CAF50'/g,
  `const montoCierre = base + ventasEfectivo

              const isAbierto = turno.estado === 'abierto'`
);

// Replace Row Render
content = content.replace(
  /<td className="text-sm text-gray font-mono">\s*\{new Date\(turno\.fecha_apertura\)\.toLocaleString\('es-BO', \{ dateStyle: 'short', timeStyle: 'short' \}\)\}\s*<\/td>/g,
  `<td className="text-sm text-gray font-mono">
                    <div>{new Date(turno.fecha_apertura).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}</div>
                    {!isAbierto && turno.fecha_cierre && (
                      <div style={{ color: 'var(--text-500)', fontSize: '0.75rem', marginTop: '2px' }}>
                        {new Date(turno.fecha_cierre).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    )}
                  </td>`
);

content = content.replace(
  /<td className="text-right font-mono" style=\{\{ color: 'var\(--text-200\)' \}\}>\s*Bs\. \{fmt\(cajaEsperada\)\}\s*<div style=\{\{ fontSize: '0\.7rem', color: 'var\(--text-500\)', marginTop: '2px' \}\}>\s*\(Base: \{fmt\(base\)\} \+ Ventas: \{fmt\(ventasEfectivo\)\}\)\s*<\/div>\s*<\/td>\s*<td className="text-right font-mono font-bold">\s*\{isAbierto \? '--' : \`Bs\. \$\{fmt\(cajaFisica\)\}\`\}\s*<\/td>\s*<td className="text-right font-mono font-bold">\s*\{isAbierto \? \(\s*<span style=\{\{ color: 'var\(--text-500\)' \}\}>En curso<\/span>\s*\) : \(\s*<div style=\{\{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', color: difColor \}\}>\s*<span style=\{\{ display: 'flex', alignItems: 'center', gap: '4px' \}\}>\s*\{diferencia < 0 \? <AlertCircle size=\{14\}\/> : diferencia === 0 \? <CheckCircle2 size=\{14\}\/> : null\}\s*\{diferencia > 0 \? '\+' : ''\}\{fmt\(diferencia\)\}\s*<\/span>\s*\{diferencia < 0 && <span style=\{\{ fontSize: '0\.7rem', fontWeight: 500 \}\}>Faltante<\/span>\}\s*\{diferencia > 0 && <span style=\{\{ fontSize: '0\.7rem', fontWeight: 500 \}\}>Sobrante<\/span>\}\s*\{diferencia === 0 && <span style=\{\{ fontSize: '0\.7rem', fontWeight: 500 \}\}>Cuadre Perfecto<\/span>\}\s*<\/div>\s*\)\}\s*<\/td>/g,
  `<td className="text-right font-mono" style={{ color: 'var(--text-200)' }}>
                    Bs. {fmt(ventasEfectivo)}
                  </td>
                  
                  <td className="text-right font-mono font-bold" style={{ color: 'var(--text-100)' }}>
                    {isAbierto ? (
                      <span style={{ color: 'var(--text-500)' }}>En curso</span>
                    ) : (
                      <span style={{ color: 'var(--green)' }}>Bs. {fmt(montoCierre)}</span>
                    )}
                  </td>`
);

fs.writeFileSync('app/admin/caja/page.tsx', content);
console.log("Done");
