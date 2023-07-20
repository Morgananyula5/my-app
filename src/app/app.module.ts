import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './sign-up/sign-up.component';
import { CustomerComponent } from './customer/customer.component';
import { DriverLoginComponent } from './driver-login/driver-login.component';
import { DriverSignupComponent } from './driver-signup/driver-signup.component';
import { DriverComponent } from './driver/driver.component';
import { DriverService } from './services/driver.service';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    SignupComponent,
    CustomerComponent,
    DriverLoginComponent,
    DriverSignupComponent,
    DriverComponent
  ],
  imports: [
    BrowserModule,
    LeafletModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot([
      { path: 'login', component: LoginComponent },
      { path: 'sign-up', component: SignupComponent },
      { path: 'customer', component: CustomerComponent },
      { path: 'driver-login', component: DriverLoginComponent },
      { path: 'driver-signup', component: DriverSignupComponent }
    ])
  ],
  providers: [DriverService],
  bootstrap: [AppComponent]
})
export class AppModule { }
