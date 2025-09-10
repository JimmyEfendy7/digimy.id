/**
 * Ekstrak label dari teks deskripsi (teks dalam kurung kurawal {label})
 * @param description String deskripsi yang mungkin berisi label dalam format {label}
 * @returns Object berisi array labels dan plainText
 */
export function extractLabelsFromDescription(description: string | undefined) {
  if (!description) {
    return { 
      labels: [], 
      plainText: '' 
    };
  }
  
  // Mencari pola teks dalam kurung kurawal {label}
  const regex = /{([^{}]+)}/g;
  
  // Ekstrak teks biasa (tanpa kurung kurawal)
  const plainText = description.replace(regex, '').trim();
  
  // Ekstrak semua label
  const labels: string[] = [];
  let match;
  while ((match = regex.exec(description)) !== null) {
    labels.push(match[1].trim());
  }
  
  return {
    labels,
    plainText
  };
}

/**
 * Format currency to IDR
 * @param value Number to format
 * @returns Formatted currency string
 */
export function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
} 