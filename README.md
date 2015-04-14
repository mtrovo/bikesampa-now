# bikesampa-now
REST API de dados de estações do BikeSampa

Disponível em (https://bikesampa-now.herokuapp.com/).

## Endpoints disponíveis
#### /api/stations
Estado atual de todas as estações

#### /api/stations/near?lat={lat}&lng={lng}
6 estações mais próximas do ponto geográfico especificado na entrada.

#### /api/stations/:station_id
Estado atual da estação com id `:station_id`

#### /api/now
Resumo de estações disponíveis para entrega e retirada de bicicletas próximas a um ponto
