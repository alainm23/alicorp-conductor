import { Component, OnInit, Input } from '@angular/core';

// Services
import { DatabaseService } from '../../services/database.service';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import * as moment from 'moment';
import { CallService } from '../../services/call.service';

// Forms
import { FormGroup , FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-carga-gasolina',
  templateUrl: './carga-gasolina.page.html',
  styleUrls: ['./carga-gasolina.page.scss'],
})
export class CargaGasolinaPage implements OnInit {
  @Input () carro_id: string;

  items: any [] = [];
  form: FormGroup;

  constructor (
    private loadingController: LoadingController,
    private modalController: ModalController,
    private toastController: ToastController,
    private phone_service: CallService,
    private database: DatabaseService) { }

  async ngOnInit () {
    this.form = new FormGroup ({
      id: new FormControl (this.database.createId (), Validators.required),
      vehiculo_id: new FormControl (this.carro_id, Validators.required),
      kilometraje: new FormControl ('', Validators.required),
      numero_galones: new FormControl ('', Validators.required),
      nro_boleta_factura: new FormControl ('')
    });

    const loading = await this.loadingController.create({
      message: 'Procesando...',
    });

    await loading.present ();

    this.database.get_carros ().subscribe (async (res: any []) => {
      console.log (res);
      this.items = res;
      loading.dismiss ();
    });
  }

  get_hora () {
    return moment ().format ('LT');
  }

  get_fecha () {
    return moment ().format ('LL');
  }

  async submit () {
    const loading = await this.loadingController.create({
      message: 'Procesando...',
    });

    await loading.present ();

    let data: any = {
      id: this.form.value.id,
      vehiculo_id: this.form.value.vehiculo_id,
      kilometraje: this.form.value.kilometraje,
      numero_galones: this.form.value.numero_galones,
      nro_boleta_factura: this.form.value.nro_boleta_factura,
      fecha_registro: moment ().toISOString(),
      hora_registro: moment ().format ('HH[-]MM'),
      mes: moment ().format ('MM'),
      anio: moment ().format ('YYYY'),
    }

    this.database.add_carga_gasolina (data)
      .then (async () => {
        this.presentToast ('Registro exitoso');
        await loading.dismiss ();                                                                                                         
        this.form.reset ();
        this.modalController.dismiss ();
      })
      .catch (async (error: any) => {
        await loading.dismiss ();
      });
  }

  close () {
    this.modalController.dismiss ();
  }

  async presentToast (message: string) {
    const toast = await this.toastController.create({
      message: message,
      color: 'success',
      duration: 2500
    });

    toast.present();
  }

  call () {
    this.phone_service.llamar ();
  }
}
