import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Transcripts - AI Audio Transcription',
    short_name: 'Transcripts',
    description: 'Real-time audio transcription with AI-powered summaries',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#FFF9F0',
    theme_color: '#D2691E',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
