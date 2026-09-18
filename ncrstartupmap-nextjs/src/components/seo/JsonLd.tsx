/**
 * Renders a JSON-LD `<script>` tag for schema.org markup.
 * Pass a plain object — it is serialized with JSON.stringify at render time.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
