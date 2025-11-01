import { Group } from '../types'
import { ChevronDown } from 'lucide-react'

interface GroupSelectorProps {
  groups: Group[]
  selectedGroupId: string | null
  onSelectGroup: (groupId: string | null) => void
}

export function GroupSelector({
  groups,
  selectedGroupId,
  onSelectGroup,
}: GroupSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-lg font-bold text-gray-800 mb-3">المجموعات</h2>
      <div className="space-y-2">
        <button
          onClick={() => onSelectGroup(null)}
          className={`w-full px-4 py-2 rounded-lg text-right font-medium transition-colors ${
            selectedGroupId === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          جميع المجموعات
        </button>
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            className={`w-full px-4 py-2 rounded-lg text-right font-medium transition-colors flex items-center justify-between ${
              selectedGroupId === group.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ChevronDown size={18} />
            {group.name}
          </button>
        ))}
      </div>
    </div>
  )
}
