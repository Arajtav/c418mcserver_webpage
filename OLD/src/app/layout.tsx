import "./globals.css";

import { Metadata } from "next";
import { VT323 } from "next/font/google";

// no fallbacks, also maybe change that font so something more readable
const font = VT323({
    weight: ["400"],
    subsets: ["latin-ext"],
    display: "swap",
    fallback: ["VT323"],
});

export const metadata: Metadata = {
    title: "C418 mc server",
    description: "Webpage I made to track prices of stuff on C418 minecraft server",
    authors: [{ name: "Aräjtav", url: "https://arajtav.com" }],
    creator: "Aräjtav",
    robots: {
        index: false,
        follow: false,
        nocache: true,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={font.className}>
            <body className="text-neutral-200 bg-image-default bg-fixed bg-center bg-cover selection:bg-neutral-200 selection:text-neutral-700">
                {children}
            </body>
        </html>
    );
}
