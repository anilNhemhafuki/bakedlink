import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F5DC] to-[#D2B48C]">
      <Card className="w-full max-w-md mx-4 shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-[#8B4513] rounded-lg flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-bread-slice text-white text-2xl"></i>
          </div>
          <CardTitle className="text-3xl font-bold text-[#8B4513]">
            Mero BakeSoft
          </CardTitle>
          <p className="text-[#8B4513]/80 mt-2">
            Professional Bakery Management System
          </p>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-gray-600">
              Streamline your bakery operations with our comprehensive management system
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Product & Inventory Management</li>
              <li>• Order Processing & Tracking</li>
              <li>• Production Scheduling</li>
              <li>• Sales Analytics & Reports</li>
            </ul>
          </div>
          
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="w-full bg-[#8B4513] hover:bg-[#A0522D] text-white"
            size="lg"
          >
            <i className="fas fa-sign-in-alt mr-2"></i>
            Sign In to Continue
          </Button>
          
          <p className="text-xs text-gray-500">
            Secure authentication powered by Replit
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
