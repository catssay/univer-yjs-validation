import type { FUniver } from '@univerjs/facade'
import { isEqual, omit } from 'lodash'

export class YUniverSheetBinding {
  private type: any
  private univerAPI: FUniver
  private awareness
  private _univerObserver
  private _typeObserver
  private _awarenessChange
  private _lastCommand

  constructor(type: any, univerAPI: FUniver, awareness: any) {
    this.type = type
    this.univerAPI = univerAPI
    this.awareness = awareness

    this._univerObserver = (change: any) => {
      // @TODO 明确协同的范围
      if (/\.mutation\./.test(change.id)) {
        // @TODO 需要合适的方法知道当前的命令来自于自己还是来自于远程
        if (!isEqual(change.params, this._lastCommand)) {
          const sheetName = univerAPI.getActiveWorkbook()?.getSheetBySheetId(change.params.subUnitId)?.getSheetName()
          type.set(change.id, { sheetName, params: omit(change.params, ['unitId', 'subUnitId']) })
        }
      }
    }
    univerAPI.onCommandExecuted(this._univerObserver)

    this._typeObserver = (e: any, tr: any) => {
      if (tr.origin) {
        [...e.keysChanged].forEach(async (key) => {
          const v = e.target.get(key)
          const workbook = univerAPI.getActiveWorkbook()
          const sheet = workbook?.getSheetByName(v.sheetName)
          this._lastCommand = {
            ...v.params,
            unitId: workbook?.getId(),
            subUnitId: sheet?.getSheetId(),
          }
          await univerAPI.executeCommand(key, this._lastCommand)
        })
      }
    }
    type.observe(this._typeObserver)

    this._awarenessChange = (change: any) => {
      console.log(change)
    }
    awareness.on('change', this._awarenessChange)
  }

  destroy() {
    this.type.off('change', this._univerObserver)
    // this.univerAPI('change')
    this.awareness.off('change', this._awarenessChange)
  }
}
