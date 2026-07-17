# Misión

## Producto

**transcefrencias** es una herramienta web instalable para dividir gastos dentro de grupos pequeños de amigos de forma justa, simple y transparente.

Un evento representa una juntada completa, por ejemplo `SÁBADO`. Dentro del mismo evento pueden coexistir gastos de comida, bebida, alcohol, porro u otros conceptos, aunque cada gasto haya sido consumido por personas diferentes.

## Problema

Sumar todo lo gastado y dividirlo entre todos es injusto cuando no todas las personas participaron de todos los consumos. Calcular manualmente cada subconjunto y luego compensar las deudas es tedioso y propenso a errores.

## Solución

Para cada gasto, transcefrencias registra:

- quién pagó;
- cuánto pagó;
- qué se compró;
- quiénes participaron de ese gasto.

Después calcula el saldo neto de cada persona y propone transferencias optimizadas para saldar el evento con pocas operaciones.

## Principios

1. **Justicia por gasto:** cada persona paga solo lo que compartió.
2. **Carga rápida:** la operación habitual debe requerir pocos toques desde el celular.
3. **Confianza entre amigos:** los registros de pago son opcionales, no burocráticos.
4. **Transparencia:** todo saldo debe poder explicarse a partir de gastos concretos.
5. **Historial confiable:** editar o eliminar no debe destruir la trazabilidad.
6. **Sin costo operativo:** usar planes gratuitos de GitHub, Supabase y Vercel dentro de sus límites.
7. **Mobile-first real:** diseñar primero para celular y adaptar luego a escritorio.

## Público inicial

Grupos pequeños de amigos o familiares. El caso de referencia tiene 14 integrantes y los eventos normalmente no superarán unas 15 personas, pero el producto no impondrá un límite artificial de 15.

## Fuera del MVP

- Pagos online o integración bancaria.
- Múltiples monedas.
- Centavos.
- División por porcentajes, cantidades o importes personalizados.
- Fotografías o comprobantes.
- Chat interno.
- Emails de invitación.
- Traducciones.
- Notificaciones push obligatorias.
