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
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-50 hover:from-blue-200 hover:to-blue-100 text-gray-800 font-semibold transition-all flex items-center justify-between shadow-sm border border-blue-200"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown size={18} className="text-gray-700" />
                  ) : (
                    <ChevronUp size={18} className="text-gray-700 transform rotate-180" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span>{stage}</span>
                  <Layers size={18} className="text-blue-600" />
                </div>
              </button>

              {isExpanded && (
                <div className="bg-gray-50 p-2 space-y-1">
                  {stageGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => onSelectGroup(group.id)}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-between ${
                        selectedGroupId === group.id
                          ? 'bg-gradient-to-r from-teal-100 to-teal-50 text-gray-800 shadow-md border-2 border-teal-300'
                          : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200'
                      }`}
                    >
                      <span className="text-sm text-gray-600">1 طالب</span>
                      <span>{group.name}</span>
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
