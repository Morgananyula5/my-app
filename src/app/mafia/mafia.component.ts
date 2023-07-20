import { NsService } from '../ns.service';
import { Component } from '@angular/core';

@Component({
  selector: 'app-mafia',
  templateUrl: './mafia.component.html',
  styleUrls: ['./mafia.component.css']
})
export class MafiaComponent {

 

  bugattiRoster = ['Travis Scott', 'Benzema', 'Lil uzi vert','Andrew Tate','Cristiano Ronaldo'];
  currentName = '';

  
  
  add() {
    this.bugattiRoster.push(this.currentName);
  }
  state = true;


toggleDisplay() {
  this.state = !this.state;
}

  
myobject = {
  color: 'black and blue',
  type:'Veyron',
  cost: '$1,900,000',
  material :'Carbon'
};

//nsService
message: string = "";
constructor(private nsService: NsService) { }

ngOnInit(): void{
  this.message = this.nsService.getMsg();
}

}


