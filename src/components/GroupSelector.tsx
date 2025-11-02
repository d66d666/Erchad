import { useState } from 'react'
import { Group } from '../types'
import { ChevronDown, ChevronUp, Layers } from 'lucide-react'

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
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

  // Define stage order
  const stageOrder: Record<string, number> = {
    'الصف الاول الثانوي': 1,
    'الصف الثاني الثانوي': 2,
    'الصف الثالث الثانوي': 3,
  }

  const groupedByStage = groups.reduce((acc, group) => {
    if (!acc[group.stage]) {
      acc[group.stage] = []
    }
    acc[group.stage].push(group)
    return acc
  }, {} as Record<string, Group[]>)

  // Sort stages by defined order
  const sortedStages = Object.entries(groupedByStage).sort((a, b) => {
    const orderA = stageOrder[a[0]] || 999
    const orderB = stageOrder[b[0]] || 999
    return orderA - orderB
  })

  const toggleStage = (stage: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stage)) {
        next.delete(stage)
      } else {
        next.add(stage)
      }
      return next
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="space-y-2">
        <button
          onClick={() => onSelectGroup(null)}
          className={`w-full px-4 py-2 rounded-lg text-right font-medium transition-all ${
            selectedGroupId === null
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          جميع المجموعات
        </button>

        {sortedStages.map(([stage, stageGroups]) => {
          const isExpanded = expandedStages.has(stage)
          return (
            <div key={stage} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleStage(stage)}
                className="w-full px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold transition-all flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-white" />
                  <span>{stage}</span>
                </div>
                {isExpanded ? (
                  <ChevronUp size={18} className="text-white" />
                ) : (
                  <ChevronDown size={18} className="text-white" />
                )}
              </button>

              {isExpanded && (
                <div className="bg-gray-50 p-2 space-y-1">
                  {stageGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => onSelectGroup(group.id)}
                      className={`w-full px-4 py-2 rounded-lg text-right font-medium transition-all ${
                        selectedGroupId === group.id
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {group.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
