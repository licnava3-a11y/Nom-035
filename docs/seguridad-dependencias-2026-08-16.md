# Revisión de dependencias residuales

**Fecha:** 2026-08-16  
**Comando de verificación:** `pnpm audit --prod --json`

## Resultado

La revisión posterior a las actualizaciones controladas reporta **0 vulnerabilidades críticas** y **22 hallazgos altos**. El descenso reciente proviene de actualizar Nodemailer a la línea 9.0.x, actualizar Nanoid dentro de su versión mayor compatible y aplicar overrides corregidos para DOMPurify, Mermaid, Lodash, Lodash ES, WS y dependencias de parsing/transporte.

| Área | Medida aplicada | Condición de revisión |
|---|---|---|
| SMTP | Nodemailer 9.0.5 y desactivación de acceso a archivos y URL remotas | Revisar en cada actualización mayor del proveedor SMTP o nueva alerta de Nodemailer |
| Importaciones tabulares | XLSX limitado por tamaño, formato y lectura sin fórmulas, HTML de celdas ni VBA | Sustituir la biblioteca cuando exista una versión corregida o alternativa compatible |
| Dependencias transitivas | Overrides para DOMPurify, Mermaid, Lodash/Lodash ES, WS, Nanoid y parsers | Ejecutar auditoría en CI y revisar si un override cambia el contrato de la dependencia padre |
| Herramientas de build | Plugins no usados retirados del runtime de producción | Conservarlos como dependencias de desarrollo y no incluirlos en imágenes finales |

Los 22 hallazgos restantes incluyen dependencias transitivas de bibliotecas de visualización y procesamiento, además de `xlsx`, cuya versión publicada continúa siendo la línea 0.18.5. No se fuerzan actualizaciones mayores incompatibles: se mantienen controles de entrada y una condición explícita de reevaluación en cada publicación.

## Procedimiento operativo

Antes de publicar una nueva versión se debe ejecutar `pnpm audit --prod --json`. Una vulnerabilidad crítica bloquea la publicación; las vulnerabilidades altas se revisan contra esta matriz y deben tener parche, override compatible o control compensatorio documentado.
