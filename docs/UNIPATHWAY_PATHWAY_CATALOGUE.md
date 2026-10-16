# Pathway discovery and entry requirements

The pathways view now supports qualification/university/programme/country search, destination and pathway-type filters, alphabetical sorting and twelve-route pages. Staff additionally filter published versus internal records. Existing leadership verification/publication actions remain attached to each displayed route.

Learners see only verified and published routes returned by the existing tenant-scoped RLS query. The catalogue repeats that restriction in its presentation layer. It displays destination programme, qualification and level, entry stage, grade and English-language requirements. Missing values are explicitly unrecorded; the application does not invent eligibility or promise admission, credit transfer or visas.

Filters reset with the tenant or learner/staff mode. This increment uses existing loaded fields and adds no database migrations, permissions, external links or provider calls. Validation covers learner visibility, missing requirements, combined filters, pagination and retained staff actions. Live staging gates and institution-specific verification remain outstanding.
