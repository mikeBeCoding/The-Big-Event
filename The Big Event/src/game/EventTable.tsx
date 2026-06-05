export default function EventTable() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-end justify-center pb-4 sm:pb-6"
      style={{ perspective: '1100px' }}
    >
      {/* Table base */}
      <div
        className="w-[94%] sm:w-3/4 max-w-2xl origin-bottom"
        style={{ transform: 'rotateX(45deg)' }}
      >
        {/* Tablecloth */}
        <div className="bg-purple-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Table top surface with subtle shine */}
          <div className="relative bg-gradient-to-b from-purple-600 to-purple-700 p-4 sm:p-6">
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

            {/* Pizza boxes stack */}
            <div className="flex justify-around items-start mb-4 sm:mb-6 relative z-10">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="transform -rotate-3 hover:rotate-0 transition-transform"
                  style={{ marginTop: `${i * 8}px` }}
                >
                  <div className="bg-yellow-100 border-2 sm:border-4 border-yellow-600 rounded-sm shadow-lg w-16 h-6 sm:w-[120px] sm:h-[35px]">
                    <div className="h-full flex items-center justify-center text-[9px] sm:text-xs font-bold text-yellow-700">
                      PIZZA
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Flyers and brochures */}
            <div className="flex justify-around mb-4 relative z-10">
              {[
                { color: 'bg-blue-100', title: 'Mobile' },
                { color: 'bg-orange-100', title: 'Support' },
                { color: 'bg-green-100', title: 'Member Perks' },
                { color: 'bg-red-100', title: 'Plans' },
              ].map((flyer, i) => (
                <div
                  key={i}
                  className={`${flyer.color} p-1.5 sm:p-3 rounded shadow-md border-l-2 sm:border-l-4 border-gray-400 transform -rotate-2 hover:rotate-1 transition-transform w-14 h-12 sm:w-[90px] sm:h-[70px]`}
                >
                  <div className="text-[10px] sm:text-xs font-bold text-gray-800 text-center">
                    {flyer.title}
                  </div>
                </div>
              ))}
            </div>

            {/* Branded event materials */}
            <div className="flex justify-between items-center gap-2 text-white text-[10px] sm:text-sm font-semibold relative z-10">
              <div className="px-2 py-1 sm:px-4 sm:py-2 bg-white/20 rounded-lg backdrop-blur">
                Community Event 2026 🎉
              </div>
              <div className="px-2 py-1 sm:px-4 sm:py-2 bg-white/20 rounded-lg backdrop-blur">
                Let's Connect 📶
              </div>
            </div>
          </div>

          {/* Table skirt — tablecloth draping to the floor (gives the table height) */}
          <div className="h-14 sm:h-28 bg-gradient-to-b from-purple-800 to-purple-900 shadow-lg" />
        </div>
      </div>
    </div>
  )
}
