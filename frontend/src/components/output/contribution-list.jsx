export default function MemorialContributionsPage({ contributors }) {
  return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {
          contributors?.length === 0 ? (
            <div className="col-span-full text-center text-gray-500">
              No contributions yet.
            </div>
          ):(
            contributors?.map((contributor) => (
          <div
            key={contributor.id}
            className="border border-gray-300 rounded-md p-5 flex items-center gap-5 bg-white"
          >
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gray-300 shrink-0" />

            {/* Content */}
            <div className="flex-1">
              <h2 className="text-xl font-medium text-black">
                {contributor.name}
              </h2>

              <p className="text-sm text-gray-700 mt-1">
                {contributors.length} contributions
              </p>

              <p className="text-[12px] text-gray-600 mt-1">
                Last submitted{" "}
                {contributor.submitted_at
                  ? new Date(contributor.submitted_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
                  : "N/A"}
              </p>

              <button className="mt-4 bg-gray-200 hover:bg-gray-300 transition px-6 py-2 rounded-lg text-sm text-black">
                {contributor.relationship_type}
              </button>
            </div>
          </div>
        ))
          )
        }

      </div>
  );
}
