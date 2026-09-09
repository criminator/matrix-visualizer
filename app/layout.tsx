import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Matrix Space — Interactive 3D Matrix Visualizer',description:'Edit a matrix and explore transformations, basis vectors, and the geometry of linear algebra in 3D.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>;}
