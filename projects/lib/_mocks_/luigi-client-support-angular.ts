import { Observable, of } from 'rxjs';
export class LuigiContextService {
  contextObservable(): Observable<{ context: any }> {
    return of({ context: null });
  }
}
