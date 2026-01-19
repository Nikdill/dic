import { Pipe, PipeTransform } from '@angular/core'

function mix(value: string[], result: string[] = []): string[] {
  const valueCopy = value.slice(0);
  if(!valueCopy.length) {
    return result;
  }
  const item = valueCopy.splice(Math.floor(Math.random() * valueCopy.length), 1)[0];
  if(item) {
    result.push(item)
  }

  return mix(valueCopy, result);
}

@Pipe({
  name: 'dicMix'
})
export class MixPipe implements PipeTransform {
  transform(value: string): string[] {
    return mix(value.split('').map(item => item.trim().toLowerCase()));
  }
}
