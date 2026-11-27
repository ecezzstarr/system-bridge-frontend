# Legacy Eight Core (retired)

The former privileged standalone service is no longer a supported operating path. Do not deploy it publicly. All operations except non-sensitive health return HTTP 410 in this source version. Administrations must disable any older deployed Cloud Run revisions, remove public invoker access and review access logs and credentials independently. Existing production deployments are not changed by this source patch. Use Weave's authenticated Code Workshop and Release Workshop instead.
