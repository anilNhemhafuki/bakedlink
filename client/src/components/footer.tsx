import { Facebook, Instagram, Linkedin, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 px-4 py-3 text-center text-sm text-gray-600">
      {/* Copyright */}
      <p className="mb-2">
        © {new Date().getFullYear()} M.A.P. Tech Pvt. Ltd. All rights reserved.
      </p>

      {/* Social Media Links */}
      <a
        href="https://facebook.com/maptechnepal "
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook"
      >
        <Facebook className="h-5 w-5 text-gray-500 hover:text-blue-600" />
      </a>
      <a
        href="https://instagram.com/maptechnepal "
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
      >
        <Instagram className="h-5 w-5 text-gray-500 hover:text-pink-600" />
      </a>
      <a
        href="https://linkedin.com/company/maptech-nepal "
        target="_blank"
        rel="noopener noreferrer"
        aria-label="LinkedIn"
      >
        <Linkedin className="h-5 w-5 text-gray-500 hover:text-blue-700" />
      </a>
      <a
        href="https://maptech.com.np "
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Website"
      >
        <Globe className="h-5 w-5 text-gray-500 hover:text-green-600" />
      </a>
    </footer>
  );
}
