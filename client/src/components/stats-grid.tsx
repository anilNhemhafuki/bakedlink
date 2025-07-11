interface StatsGridProps {
  stats?: {
    todaySales: number;
    todayOrders: number;
    productsInStock: number;
    lowStockItems: number;
    productionToday: number;
  };
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const statCards = [
    {
      title: "Today's Sales",
      value: `$${(stats?.todaySales || 0).toFixed(2)}`,
      change: "+12% from yesterday",
      icon: "fas fa-dollar-sign",
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      changeColor: "text-green-600"
    },
    {
      title: "Orders Today",
      value: stats?.todayOrders?.toString() || "0",
      change: "+8% from yesterday",
      icon: "fas fa-shopping-bag",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      changeColor: "text-green-600"
    },
    {
      title: "Products in Stock",
      value: stats?.productsInStock?.toString() || "0",
      change: `${stats?.lowStockItems || 0} items low stock`,
      icon: "fas fa-boxes",
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
      changeColor: stats?.lowStockItems ? "text-orange-600" : "text-green-600"
    },
    {
      title: "Production Today",
      value: stats?.productionToday?.toString() || "0",
      change: "items completed",
      icon: "fas fa-industry",
      bgColor: "bg-primary/20",
      iconColor: "text-primary",
      changeColor: "text-green-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card, index) => (
        <div key={index} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl p-6 border border-gray-100 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">{card.title}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{card.value}</p>
              <p className={`text-sm font-medium ${card.changeColor} flex items-center`}>
                {card.change?.includes('+') && <i className="fas fa-arrow-up mr-1"></i>}
                {card.change?.includes('-') && <i className="fas fa-arrow-down mr-1"></i>}
                {card.change}
              </p>
            </div>
            <div className={`w-14 h-14 ${card.bgColor} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <i className={`${card.icon} ${card.iconColor} text-xl`}></i>
            </div>
          </div>
          
          {/* Progress bar indicator */}
          <div className="mt-4 w-full bg-gray-100 rounded-full h-1">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(Math.abs(parseFloat(card.change?.replace(/[^0-9.-]/g, '') || '0')), 100)}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}
