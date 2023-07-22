import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-driver-signup',
  templateUrl: './driver-signup.component.html',
  styleUrls: ['./driver-signup.component.css'],
})
export class DriverSignupComponent {
  name = '';
  email = '';
  password = '';
  phoneNumber='';
  truckType='';
  numberPlate='';

  @Output() continue = new EventEmitter<void>();

  onSubmit() {
    if (this.name && this.email && this.password) { 
      this.continue.emit();
    } else {
      alert('Please fill in all the fields.');
    }
  }
}



/*import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-driver-signup',
  templateUrl: './driver-signup.component.html',
  styleUrls: ['./driver-signup.component.css'],
})
export class DriverSignupComponent {
  name = '';
  email = '';
  password = '';

  @Output() continue = new EventEmitter<void>();

  onSubmit() {
    if (this.name && this.email && this.password) { // Check if all fields are filled
      // Perform driver signup
      // ...
      // If signup is successful, emit the 'continue' event
      this.continue.emit();
    } else {
      alert('Please fill in all the fields.');
    }
  }
}

*/