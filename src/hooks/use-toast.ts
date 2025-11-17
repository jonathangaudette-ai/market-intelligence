export function useToast() {
  return {
    toast: ({ title, description, variant }: { title: string; description: string; variant?: 'default' | 'destructive' }) => {
      // Simple alert-based toast for now
      // TODO: Replace with proper toast component
      const message = `${title}\n\n${description}`;

      if (variant === 'destructive') {
        console.error(`[Toast Error] ${title}:`, description);
      } else {
        console.log(`[Toast] ${title}:`, description);
      }

      // Use browser alert for now
      alert(message);
    }
  };
}
