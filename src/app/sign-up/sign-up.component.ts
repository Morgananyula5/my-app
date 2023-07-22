import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
})
export class SignupComponent {
  fullName: string = '';
  email: string = '';
  password: string = '';

  @Output() continue: EventEmitter<any> = new EventEmitter<any>();

  continueSignup() {
    if (this.fullName && this.email && this.password) { 
      const userDetails = {
        fullName: this.fullName,
        email: this.email,
        password: this.password
      };
      this.continue.emit(userDetails);
    } else {
      alert('Please fill in all the fields.');
    }
  }
}



/*import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
})
export class SignupComponent {
  fullName: string = '';
  email: string = '';
  password: string = '';

  @Output() continue: EventEmitter<any> = new EventEmitter<any>();

  continueSignup() {
    if (this.fullName && this.email && this.password) { // Check if all fields are filled
      const userDetails = {
        fullName: this.fullName,
        email: this.email,
        password: this.password
      };
      this.continue.emit(userDetails);
    } else {
      alert('Please fill in all the fields.');
    }
  }
}
*/



/*
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
})
export class SignupComponent {
  fullName: string = '';
  email: string = '';
  password: string = '';

  @Output() continue: EventEmitter<any> = new EventEmitter<any>();

  continueSignup() {
    const userDetails = {
      fullName: this.fullName,
      email: this.email,
      password: this.password
    };
    this.continue.emit(userDetails);
  }
}

*/