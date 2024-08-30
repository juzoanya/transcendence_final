#!/bin/bash

MYCERT=pong
CANAME=rootCA

mkdir -p ./ssl/tmp
mkdir -p ./ssl/certs
mkdir -p ./ssl/private

mkdir -p ./ssl/$CANAME
# generate certificate, 1826 days = 5 years for CA (Certificate Authority)
openssl req -x509 -new -noenc -sha256 \
-days 1826 \
-newkey rsa:4096 \
-keyout ssl/tmp/$CANAME.key \
-out ssl/$CANAME/$CANAME.crt \
-subj '/CN=MyOrg rootCA/C=AT/ST=default/L=default/O=MyOrg'


# mkdir -p ./$MYCERT

# generate certificate for server
openssl req -new -noenc \
    -newkey rsa:4096 \
    -keyout ssl/private/$MYCERT.key \
    -out ssl/tmp/$MYCERT.csr \
    -subj "/CN=*.$MYCERT/C=AT/ST=default/L=default/O=MyOrg"

# create a v3 ext file for SAN properties
cat > ssl/tmp/$MYCERT.v3.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
extendedKeyUsage = serverAuth, clientAuth
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names
[alt_names]
DNS.1 = $MYCERT
DNS.2 = api.$MYCERT
IP=10.12.13.7
EOF

openssl x509 -req -days 365 -sha256 \
    -in ssl/tmp/$MYCERT.csr \
    -CAcreateserial \
    -CA ssl/$CANAME/$CANAME.crt \
    -CAkey ssl/tmp/$CANAME.key \
    -out ssl/certs/$MYCERT.crt \
    -extfile ssl/tmp/$MYCERT.v3.ext


rm -r ssl/tmp
# cp $CANAME/$CANAME.crt $MYCERT/
 

# #!/bin/bash

# MYCERT=pong


# CANAME=rootCA
# if [ ! -f $CANAME/$CANAME.key ]; then
#     mkdir -p ./$CANAME
#     # generate certificate, 1826 days = 5 years for CA (Certificate Authority)
#     openssl req -x509 -new -noenc -sha256 \
#     -days 1826 \
#     -newkey rsa:4096 \
#     -keyout $CANAME/$CANAME.key \
#     -out $CANAME/$CANAME.crt \
#     -subj '/CN=MyOrg rootCA/C=AT/ST=default/L=default/O=MyOrg'
# fi


# mkdir -p ./$MYCERT

# # generate certificate for server
# openssl req -new -noenc \
#     -newkey rsa:4096 \
#     -keyout $MYCERT/$MYCERT.key \
#     -out $MYCERT/$MYCERT.csr \
#     -subj "/CN=*.$MYCERT/C=AT/ST=default/L=default/O=MyOrg"

# # create a v3 ext file for SAN properties
# cat > $MYCERT/$MYCERT.v3.ext << EOF
# authorityKeyIdentifier=keyid,issuer
# basicConstraints=CA:FALSE
# extendedKeyUsage = serverAuth, clientAuth
# keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
# subjectAltName = @alt_names
# [alt_names]
# DNS.1 = $MYCERT
# DNS.2 = api.$MYCERT
# IP=10.12.13.7
# EOF

# openssl x509 -req -days 365 -sha256 \
#     -in $MYCERT/$MYCERT.csr \
#     -CAcreateserial \
#     -CA $CANAME/$CANAME.crt \
#     -CAkey $CANAME/$CANAME.key \
#     -out $MYCERT/$MYCERT.crt \
#     -extfile $MYCERT/$MYCERT.v3.ext


# cp $CANAME/$CANAME.crt $MYCERT/
 

